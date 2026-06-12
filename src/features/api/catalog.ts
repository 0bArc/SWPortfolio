export type ApiEndpointDoc = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  auth: "api_key" | "session" | "public";
  description: string;
};

export const API_V1_ENDPOINTS: ApiEndpointDoc[] = [
  {
    method: "GET",
    path: "/api/v1/me",
    auth: "api_key",
    description: "Account tied to the key (username, display name).",
  },
  {
    method: "GET",
    path: "/api/v1/posts",
    auth: "api_key",
    description: "Published blog posts (metadata only).",
  },
  {
    method: "GET",
    path: "/api/v1/posts/{slug}",
    auth: "api_key",
    description: "Single published post including markdown content.",
  },
  {
    method: "GET",
    path: "/api/v1/comments/{postSlug}",
    auth: "api_key",
    description: "Comments on a published post.",
  },
  {
    method: "GET",
    path: "/api/repo/{slug}",
    auth: "public",
    description: "GitHub repo metadata and branches (no key required).",
  },
];
