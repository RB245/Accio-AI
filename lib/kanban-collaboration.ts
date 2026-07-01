import "server-only";

import { and, eq, or } from "drizzle-orm";

import { db, kanbanBoardCollaborators, kanbanBoards, users } from "@/db";
import type { KanbanCollaboratorView } from "@/lib/kanban-types";

export const kanbanRoomPrefix = "kanban:board:";

export function getKanbanRoomId(boardId: number) {
  return `${kanbanRoomPrefix}${boardId}`;
}

export function parseKanbanRoomId(roomId: string) {
  if (!roomId.startsWith(kanbanRoomPrefix)) {
    return null;
  }

  const boardId = Number(roomId.slice(kanbanRoomPrefix.length));
  return Number.isInteger(boardId) && boardId > 0 ? boardId : null;
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function userPresenceColor(seed: string | number) {
  const colors = ["#ef6f61", "#10a37f", "#0ea5e9", "#8b5cf6", "#f59e0b", "#84a11f"];
  const value = String(seed);
  const total = Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return colors[total % colors.length];
}

export async function assertCanAccessKanbanBoard(boardId: number, user: typeof users.$inferSelect) {
  const [board] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, boardId)).limit(1);

  if (!board) {
    throw new Error("Kanban board not found.");
  }

  if (board.userId === user.id) {
    return { board, isOwner: true };
  }

  const [collaborator] = await db
    .select()
    .from(kanbanBoardCollaborators)
    .where(
      and(
        eq(kanbanBoardCollaborators.boardId, boardId),
        or(eq(kanbanBoardCollaborators.userId, user.id), eq(kanbanBoardCollaborators.email, user.email))
      )
    )
    .limit(1);

  if (!collaborator) {
    throw new Error("Kanban board not found.");
  }

  if (!collaborator.userId) {
    await db
      .update(kanbanBoardCollaborators)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(eq(kanbanBoardCollaborators.id, collaborator.id));
  }

  return { board, isOwner: false };
}

export async function assertOwnsKanbanBoard(boardId: number, user: typeof users.$inferSelect) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, user.id)))
    .limit(1);

  if (!board) {
    throw new Error("Kanban board not found.");
  }

  return board;
}

export async function listKanbanBoardCollaborators(board: typeof kanbanBoards.$inferSelect) {
  const rows = await db
    .select({
      collaborator: kanbanBoardCollaborators,
      user: users,
    })
    .from(kanbanBoardCollaborators)
    .leftJoin(users, eq(kanbanBoardCollaborators.userId, users.id))
    .where(eq(kanbanBoardCollaborators.boardId, board.id));

  const owner = await db.select().from(users).where(eq(users.id, board.userId)).limit(1);
  const ownerUser = owner[0] ?? null;

  return [
    {
      id: 0 - board.id,
      boardId: board.id,
      userId: board.userId,
      email: ownerUser?.email ?? "",
      name: ownerUser?.name ?? null,
      role: "editor" as const,
      status: "active" as const,
      isOwner: true,
      createdAt: board.createdAt.toISOString(),
    },
    ...rows.map(({ collaborator, user }): KanbanCollaboratorView => {
      const resolvedUser = user ?? null;
      return {
        id: collaborator.id,
        boardId: collaborator.boardId,
        userId: collaborator.userId,
        email: collaborator.email,
        name: resolvedUser?.name ?? null,
        role: collaborator.role,
        status: collaborator.userId ? "active" : "pending",
        isOwner: false,
        createdAt: collaborator.createdAt.toISOString(),
      };
    }),
  ];
}
