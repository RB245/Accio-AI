import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { db, users } from "@/db";

export type SyncUserResult =
  | { ok: true; user: typeof users.$inferSelect }
  | { ok: false; status: 401 | 400; error: string };

export async function syncCurrentUserByEmail(): Promise<SyncUserResult> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return {
      ok: false,
      status: 401,
      error: "User must be signed in.",
    };
  }

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    return {
      ok: false,
      status: 400,
      error: "Signed-in user does not have a primary email address.",
    };
  }

  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const [savedUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email: primaryEmail,
      name: name || clerkUser.username || null,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        clerkId: clerkUser.id,
        name: name || clerkUser.username || null,
      },
    })
    .returning();

  return {
    ok: true,
    user: savedUser,
  };
}
