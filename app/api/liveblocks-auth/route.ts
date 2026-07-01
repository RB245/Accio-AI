import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

import { assertCanAccessKanbanBoard, parseKanbanRoomId, userPresenceColor } from "@/lib/kanban-collaboration";
import { syncCurrentUserByEmail } from "@/lib/sync-user";

const secret = process.env.LIVEBLOCKS_SECRET_KEY;

export async function POST(request: Request) {
  if (!secret) {
    return NextResponse.json({ error: "Liveblocks is not configured." }, { status: 500 });
  }

  const result = await syncCurrentUserByEmail();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = (await request.json().catch(() => null)) as { room?: string } | null;
  const room = body?.room;

  if (!room) {
    return NextResponse.json({ error: "Room is required." }, { status: 400 });
  }

  const boardId = parseKanbanRoomId(room);

  if (!boardId) {
    return NextResponse.json({ error: "Invalid room." }, { status: 400 });
  }

  await assertCanAccessKanbanBoard(boardId, result.user);

  const liveblocks = new Liveblocks({ secret });
  const session = liveblocks.prepareSession(String(result.user.id), {
    userInfo: {
      name: result.user.name || result.user.email,
      email: result.user.email,
      color: userPresenceColor(result.user.email),
    },
  });

  session.allow(room, ["*:write"]);

  const { status, body: responseBody } = await session.authorize();
  return new Response(responseBody, { status });
}
