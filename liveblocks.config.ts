import type { LiveObject } from "@liveblocks/client";
import type { KanbanBoardView, KanbanCollaboratorView, KanbanColumnView, KanbanTaskView } from "@/lib/kanban-types";

type Presence = {
  selectedTaskId?: number | null;
};

type Storage = {
  boardVersion?: number;
  input?: LiveObject<{ text: string }>;
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    color: string;
    avatar?: string;
  };
};

type ThreadMetadata = {
  type: "kanban-task";
  boardId: number;
  taskId: number;
};

type RoomEvent =
  | {
      type: "kanban-sync";
      boardId: number;
      boards: KanbanBoardView[];
      columns: KanbanColumnView[];
      tasks: KanbanTaskView[];
      collaborators: KanbanCollaboratorView[];
    }
  | {
      type: "kanban-task-opened";
      taskId: number | null;
    };

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
    UserMeta: UserMeta;
    ThreadMetadata: ThreadMetadata;
    RoomEvent: RoomEvent;
  }
}

export {};
