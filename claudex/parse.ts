// parse.ts — Phase 1, step 1: read your Claude Code usage and print buckets.
// Run with:  npx tsx parse.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

type Bucket = {
  date: string;
  hour: number;
  model: string;
  project: string;
  inTokens: number;
  outTokens: number;
  cacheCreate: number;
  cacheRead: number;
  messages: number;
  sessions: Set<string>;
};

// Recursively collect every .jsonl file under a directory (defensive).
function findJsonlFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // dir missing or unreadable — just return nothing
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJsonlFiles(full));
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

const buckets = new Map<string, Bucket>();
const seenUuids = new Set<string>(); // global dedup across all files
let skippedLines = 0;

function add(entry: any) {
  const usage = entry?.message?.usage;
  if (entry?.type !== "assistant" || !usage) return;   // only billed assistant turns
  const model = entry.message?.model ?? "unknown";
  if (model === "<synthetic>") return;                  // skip Claude Code's synthetic turns
  if (entry.uuid && seenUuids.has(entry.uuid)) return; // skip duplicates (resume/branch)
  if (entry.uuid) seenUuids.add(entry.uuid);

  const ts = new Date(entry.timestamp ?? Date.now());
  const date = ts.toISOString().slice(0, 10); // UTC date (good enough for now)
  const hour = ts.getUTCHours();
  const project = entry.cwd ? path.basename(entry.cwd) : "unknown";
  const sessionId = entry.sessionId ?? "unknown";

  const key = `${date}|${hour}|${model}|${project}`;
  let b = buckets.get(key);
  if (!b) {
    b = { date, hour, model, project, inTokens: 0, outTokens: 0,
          cacheCreate: 0, cacheRead: 0, messages: 0, sessions: new Set() };
    buckets.set(key, b);
  }
  b.inTokens += usage.input_tokens ?? 0;
  b.outTokens += usage.output_tokens ?? 0;
  b.cacheCreate += usage.cache_creation_input_tokens ?? 0;
  b.cacheRead += usage.cache_read_input_tokens ?? 0;
  b.messages += 1;
  b.sessions.add(sessionId);
}

const files = findJsonlFiles(PROJECTS_DIR);
console.log(`Found ${files.length} session files in ${PROJECTS_DIR}\n`);

for (const file of files) {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue; // file locked/unreadable — skip
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim(); // also strips stray \r on Windows
    if (!trimmed) continue;
    try {
      add(JSON.parse(trimmed));
    } catch {
      skippedLines++; // malformed line — skip defensively
    }
  }
}

const rows = [...buckets.values()].sort((a, b) => {
  const ka = `${a.date} ${String(a.hour).padStart(2, "0")}`;
  const kb = `${b.date} ${String(b.hour).padStart(2, "0")}`;
  return ka.localeCompare(kb);
});
let totalIn = 0, totalOut = 0;
for (const b of rows) {
  totalIn += b.inTokens;
  totalOut += b.outTokens;
  console.log(
    `${b.date} ${String(b.hour).padStart(2, "0")}h | ${b.model} | ${b.project} | ` +
    `in:${b.inTokens} out:${b.outTokens} cacheR:${b.cacheRead} ` +
    `msgs:${b.messages} sessions:${b.sessions.size}`
  );
}
console.log(
  `\n${rows.length} buckets | total in:${totalIn} out:${totalOut} | ` +
  `unique uuids:${seenUuids.size} | skipped lines:${skippedLines}`
);