import { getAdminSession } from "@/features/admin/services/auth";
import { subscribeAdminEvents } from "@/lib/network/server/events";

export async function GET(): Promise<Response> {
  const authed = await getAdminSession();
  if (!authed) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

      unsubscribe = subscribeAdminEvents((event) => {
        send(
          `event: ${event.type}\ndata: ${JSON.stringify({
            channel: event.channel,
            ...event.data,
          })}\n\n`
        );
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
