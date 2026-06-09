export type CommentAuthor = {
  username: string;
  displayName: string;
  icon: string | null;
};

export type CommentNode = {
  id: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  author: CommentAuthor;
  replies: CommentNode[];
};

export type SessionAccount = {
  username: string;
  displayName: string;
  icon: string | null;
};

export type NotificationActor = {
  username: string;
  displayName: string;
  icon: string | null;
};

export type NotificationItem = {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  postSlug: string | null;
  commentId: number | null;
  href: string;
  actor: NotificationActor | null;
};

export type SyncPollHandle = { stop: () => void };
export type SyncStreamHandle = { stop: () => void };

export type StreamChannel =
  | "notifications"
  | "session"
  | "profile"
  | "comments"
  | "admin-icons";

export type StreamRefreshData = Record<string, unknown> & {
  channel?: StreamChannel;
  postSlug?: string;
};
