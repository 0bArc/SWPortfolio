import { cacheLife, cacheTag } from "next/cache";
import { deeplConfig } from "@api-config";

interface DeepLResponse {
  translations: { text: string }[];
}

async function callDeepL(texts: string[]): Promise<string[]> {
  const apiKey = deeplConfig.apiKey;
  if (!apiKey) return texts;

  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts, source_lang: "NO", target_lang: "EN-GB" }),
  });

  if (!res.ok) return texts;

  const data: DeepLResponse = await res.json();
  return data.translations.map((t, i) => t.text ?? texts[i]);
}

export async function translatePostMeta(
  slug: string,
  title: string,
  excerpt: string
): Promise<{ title: string; excerpt: string }> {
  "use cache";
  cacheLife("max");
  cacheTag(`post-meta-${slug}`);

  const [tTitle, tExcerpt] = await callDeepL([title, excerpt]);
  return { title: tTitle, excerpt: tExcerpt };
}

export async function translatePost(
  slug: string,
  title: string,
  excerpt: string,
  body: string
): Promise<{ title: string; excerpt: string; body: string }> {
  "use cache";
  cacheLife("max");
  cacheTag(`post-${slug}`);

  const [tTitle, tExcerpt, tBody] = await callDeepL([title, excerpt, body]);
  return { title: tTitle, excerpt: tExcerpt, body: tBody };
}
