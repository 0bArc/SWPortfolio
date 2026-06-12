/** Audit log grouping — reusable across site deployments. */
export type AuditCategory =
  | "user"
  | "badge"
  | "role"
  | "media"
  | "blog"
  | "api_key"
  | "account"
  | "content"
  | "admin";

export type CommentModerationAction = "approve" | "hide" | "remove" | "restore";

export type UserModerationType = "force_name" | "force_bio" | "warn" | "ban" | "unban";

export type MediaModerationAction = "approve" | "reject" | "delete";

export type IconReviewAction = "approve" | "reject";

export type ProfileField = "displayName" | "bio" | "settings";

export type TagChangeAction = "created" | "updated" | "deleted";

/** Domain events — single contract for all site mutations. */
export type SiteEvent =
  | {
      type: "account.created";
      actorAccountId: number;
      username: string;
      displayName: string;
      emailVerificationRequired: boolean;
    }
  | {
      type: "account.deleted";
      actorAccountId: number;
      username: string;
      selfDelete: boolean;
    }
  | {
      type: "account.email_verification_sent";
      targetAccountId: number;
    }
  | {
      type: "tag.changed";
      actorAccountId: number | null;
      slug: string;
      action: TagChangeAction;
    }
  | {
      type: "comment.created";
      actorAccountId: number;
      postSlug: string;
      commentId: number;
      parentId?: number | null;
      parentAuthorId?: number | null;
      actorDisplayName: string;
    }
  | {
      type: "comment.moderated";
      actorAccountId: number | null;
      commentId: number;
      postSlug: string;
      action: CommentModerationAction;
      targetAccountId?: number | null;
      reason?: string | null;
    }
  | {
      type: "media.uploaded";
      actorAccountId: number;
      mediaId: string;
      kind: "avatar" | "blog";
      status: string;
      pendingReview: boolean;
    }
  | {
      type: "media.moderated";
      actorAccountId: number | null;
      mediaId: string;
      action: MediaModerationAction;
      kind: "avatar" | "blog";
      targetAccountId?: number | null;
      username?: string | null;
    }
  | {
      type: "icon.reviewed";
      actorAccountId: number | null;
      targetAccountId: number;
      username: string;
      action: IconReviewAction;
    }
  | {
      type: "icon.uploaded";
      actorAccountId: number;
      pendingReview: boolean;
    }
  | {
      type: "icon.removed";
      actorAccountId: number;
    }
  | {
      type: "user.moderated";
      actorAccountId: number | null;
      targetAccountId: number;
      username: string;
      moderationType: UserModerationType;
      message?: string | null;
      reason?: string | null;
      displayName?: string | null;
      banUntil?: string | null;
      notify?: boolean;
    }
  | {
      type: "user.email_verified";
      actorAccountId: number | null;
      targetAccountId: number;
      username: string;
      byStaff: boolean;
    }
  | {
      type: "badge.awarded";
      actorAccountId: number | null;
      targetAccountId: number;
      username: string;
      badgeSlug: string;
      badgeLabel?: string;
    }
  | {
      type: "badge.revoked";
      actorAccountId: number | null;
      targetAccountId: number;
      username: string;
      badgeSlug: string;
      badgeLabel?: string;
    }
  | {
      type: "post.changed";
      actorAccountId: number | null;
      slug: string;
      title: string;
      status: "draft" | "published";
      action: "created" | "updated" | "deleted";
      authorAccountId?: number | null;
    }
  | {
      type: "api_key.created";
      actorAccountId: number;
      keyId: number;
      keyName: string;
    }
  | {
      type: "api_key.revoked";
      actorAccountId: number;
      keyId: number;
      keyName?: string;
    }
  | {
      type: "profile.updated";
      actorAccountId: number;
      username: string;
      changed: ProfileField[];
    }
  | {
      type: "session.updated";
      targetAccountId: number;
    };

export type SiteEventType = SiteEvent["type"];
