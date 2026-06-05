export interface OGData {
  title: string;
  description: string;
  image: string | null;
  url: string;
  domain: string;
}

export async function fetchOG(url: string): Promise<OGData | null> {
  "use cache";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const meta = (prop: string) => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ??
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"));
      return m?.[1] ?? null;
    };

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";

    return {
      title: meta("title") ?? titleTag,
      description: meta("description") ?? "",
      image: meta("image"),
      url,
      domain: new URL(url).hostname,
    };
  } catch {
    return null;
  }
}
