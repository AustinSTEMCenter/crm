import { getAscUser, getTeam } from "@/lib/server/auth";
import { getPeople, savePeople } from "@/lib/server/people";
import type { Person } from "@/lib/types";

const forbidden = () => Response.json({ error: "ASC account required" }, { status: 403 });

export async function GET() {
  const user = await getAscUser();
  if (!user) return forbidden();
  const [people, team] = await Promise.all([getPeople(), getTeam()]);
  return Response.json({
    people,
    me: user.name,
    team: team.includes(user.name) ? team : [...team, user.name].sort(),
  });
}

export async function POST(req: Request) {
  if (!(await getAscUser())) return forbidden();
  const body = (await req.json()) as { upsert?: Person[]; remove?: string[] };
  await savePeople(body.upsert ?? [], body.remove ?? []);
  return Response.json({ ok: true });
}
