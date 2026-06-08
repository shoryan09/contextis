
"use server";
import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { Bucket } from "@/models/bucket";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function deleteAccountAction() {
  const session = await auth();
  if (!session?.user) return;

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (user) {
    await Bucket.deleteMany({ owner: String(user._id) }); // remove their data
    await User.deleteOne({ _id: user._id });               // remove the account
  }
  await signOut({ redirectTo: "/" });
}
