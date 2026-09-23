import "server-only";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ALLOWED_EMAIL_DOMAIN } from "../data";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

const ascEmail = (user: ClerkUser) =>
  user.emailAddresses.find(
    (e) =>
      e.verification?.status === "verified" &&
      e.emailAddress.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`),
  );

const displayName = (user: ClerkUser) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || ascEmail(user)?.emailAddress || "Unknown";

/** The signed-in user's name if they have an ASC Workspace email, otherwise null. */
export async function getAscUser() {
  const user = await currentUser();
  return user && ascEmail(user) ? { name: displayName(user) } : null;
}

let teamCache: { names: string[]; at: number } | null = null;

/** Everyone with an ASC email who has signed in to this Clerk app (shared with the admin dashboard). */
export async function getTeam(): Promise<string[]> {
  if (teamCache && Date.now() - teamCache.at < 5 * 60_000) return teamCache.names;
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ query: `@${ALLOWED_EMAIL_DOMAIN}`, limit: 200 });
  const names = data.filter(ascEmail).map(displayName).sort();
  teamCache = { names, at: Date.now() };
  return names;
}
