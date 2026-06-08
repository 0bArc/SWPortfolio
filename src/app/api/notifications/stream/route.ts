import { requireAccount } from "@/lib/accounts/auth";
import { subscribeAccountEvents } from "@/lib/network/server/events";
import { rateLimitAccount } from "@/lib/network/server/security";

/** Live SSE — no route segment config needed with cacheComponents. */
export async function GET(): Promise<Response> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const limited = rateLimitAccount(auth.accountId, "notif-stream", 20, 60_000);
  if (limited) return limited;

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      send("event: connected\ndata: {}\n\n");

      unsubscribe = subscribeAccountEvents(auth.accountId, (event) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event.data ?? {})}\n\n`);
      });

      heartbeat = setInterval(() => send(": ping\n\n"), 25_000);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
