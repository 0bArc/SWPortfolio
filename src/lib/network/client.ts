import { NETWORK_HEADERS, sameOriginCredentials } from "@/lib/network/security";

export class NetworkError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function networkJson<T>(url: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const res = await fetch(url, {
    credentials: sameOriginCredentials(),
    ...init,
    headers: {
      ...(hasBody ? NETWORK_HEADERS.json : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new NetworkError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  return data;
}
