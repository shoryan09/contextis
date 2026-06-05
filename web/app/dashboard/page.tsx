import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { getWrapped } from "@/lib/stats";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"] });

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
function fmtHour(h: number) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${h < 12 ? "AM" : "PM"}`;
}

// earthy, premium palette for the model split
const COLORS = ["#CC785C", "#5E6B7D", "#7A8B6F", "#C9A87C"];

const CARD =
  "rounded-2xl border border-[#ECEAE2] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,19,0.05)]";
const LABEL = "text-xs font-medium uppercase tracking-[0.14em] text-[#9B988F]";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: "7d" | "30d" = sp.range === "7d" ? "7d" : "30d";

  const session = await auth();
  if (!session?.user)
    return <main className={`${sans.className} flex min-h-screen items-center justify-center bg-[#FAF9F5] text-[#141413]`}>Please sign in on the home page first.</main>;

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (!user)
    return <main className={`${sans.className} flex min-h-screen items-center justify-center bg-[#FAF9F5] text-[#141413]`}>No user found.</main>;

  const w = await getWrapped(String(user._id), range);
  const modelTotal = w.modelSplit.reduce((s, m) => s + m.tokens, 0) || 1;
  const topMax = w.topProjects[0]?.tokens || 1;

  const stats = [
    { label: "Messages", value: fmt(w.messages) },
    { label: "Sessions", value: String(w.sessions) },
    { label: "Active days", value: String(w.activeDays) },
    { label: "Longest streak", value: `${w.longestStreak}d` },
  ];

  const tab = (r: "7d" | "30d", label: string) => (
    <Link
      href={`/dashboard?range=${r}`}
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
        range === r ? "bg-white text-[#141413] shadow-sm" : "text-[#6B6862] hover:text-[#141413]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className={`${sans.className} min-h-screen bg-[#FAF9F5] text-[#141413]`}>
      {/* top bar */}
      <header className="border-b border-[#ECEAE2]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className={`${serif.className} text-lg font-medium tracking-tight`}>claudex</Link>
          <span className="text-sm text-[#6B6862]">{session.user.name}</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* title + controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-[#9B988F]">last {range === "7d" ? "7" : "30"} days</p>
            <h1 className={`${serif.className} mt-1 text-4xl tracking-tight`}>Your Wrapped</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/og"
              target="_blank"
              className="cursor-pointer rounded-full border border-[#E0DDD2] px-4 py-1.5 text-sm text-[#6B6862] transition hover:border-[#CC785C] hover:text-[#CC785C]"
            >
              Share card
            </a>
            <div className="inline-flex rounded-full bg-[#F0EEE6] p-1">
              {tab("7d", "Week")}
              {tab("30d", "Month")}
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {/* archetype */}
          <div className="rounded-2xl border border-[#E8D9D1] bg-[#F7ECE6] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#CC785C]">Your archetype</p>
            <p className={`${serif.className} mt-2 text-3xl tracking-tight`}>
              {w.archetype.emoji} {w.archetype.name}
            </p>
            <p className="mt-2 text-sm text-[#8A6F61]">{w.archetype.reason}</p>
          </div>

          {/* total tokens hero */}
          <div className={CARD + " p-8"}>
            <p className={LABEL}>Total tokens</p>
            <p className={`${serif.className} mt-2 text-7xl leading-none tracking-tight tabular-nums`}>
              {fmt(w.totalTokens)}
            </p>
            <p className="mt-4 text-sm text-[#6B6862]">
              {fmt(w.inTokens)} in · {fmt(w.outTokens)} out · {fmt(w.cacheCreate)} cache · {fmt(w.cacheRead)} reads
            </p>
          </div>

          {/* stat grid */}
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className={CARD + " p-5"}>
                <p className={`${serif.className} text-3xl tabular-nums`}>{s.value}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-[#9B988F]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* insight */}
          <div className={CARD + " p-5"}>
            <p className={LABEL}>Insight</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3F3D39]">{w.insight}</p>
          </div>

          {/* busiest */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className={CARD + " p-5"}>
              <p className={LABEL}>Busiest day</p>
              <p className={`${serif.className} mt-2 text-2xl`}>{w.busiestDay?.date ?? "—"}</p>
              <p className="mt-1 text-sm text-[#9B988F]">{w.busiestDay ? fmt(w.busiestDay.tokens) + " tokens" : ""}</p>
            </div>
            <div className={CARD + " p-5"}>
              <p className={LABEL}>Busiest hour</p>
              <p className={`${serif.className} mt-2 text-2xl`}>{w.busiestHour ? fmtHour(w.busiestHour.hour) : "—"}</p>
              <p className="mt-1 text-sm text-[#9B988F]">{w.busiestHour ? fmt(w.busiestHour.tokens) + " tokens" : ""}</p>
            </div>
          </div>

          {/* model split */}
          <div className={CARD + " p-6"}>
            <p className={LABEL}>Model split</p>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[#EFEDE4]">
              {w.modelSplit.map((m, i) => (
                <div key={m.model} style={{ width: `${(m.tokens / modelTotal) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {w.modelSplit.map((m, i) => (
                <div key={m.model} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#3F3D39]">
                    <span style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: COLORS[i % COLORS.length] }} />
                    {m.model}
                  </span>
                  <span className="tabular-nums text-[#9B988F]">{((m.tokens / modelTotal) * 100).toFixed(0)}% · {fmt(m.tokens)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* top projects */}
          <div className={CARD + " p-6"}>
            <p className={LABEL}>Top projects</p>
            <div className="mt-4 space-y-4">
              {w.topProjects.map((p) => (
                <div key={p.project}>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3F3D39]">{p.project}</span>
                    <span className="tabular-nums text-[#9B988F]">{fmt(p.tokens)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-[#EFEDE4]">
                    <div className="h-2 rounded-full" style={{ width: `${(p.tokens / topMax) * 100}%`, backgroundColor: "#CC785C" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}