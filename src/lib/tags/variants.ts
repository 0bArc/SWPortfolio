export type TagVariant = "glass" | "rainbow" | "hacker" | "purple" | "blue" | "fire" | "cyan";

const explicit: Record<string, TagVariant> = {
  meta: "glass",
  sikkerhet: "hacker",
  security: "hacker",
  hacker: "hacker",
  hack: "hacker",
  ctf: "hacker",
  exploit: "hacker",
  pentest: "hacker",
  koding: "blue",
  code: "blue",
  dev: "blue",
  development: "purple",
  update: "cyan",
  typescript: "blue",
  javascript: "blue",
  python: "cyan",
  rust: "fire",
  "c++": "fire",
  prosjekt: "fire",
  project: "fire",
  tools: "cyan",
};

const fallbacks: TagVariant[] = ["rainbow", "purple", "cyan"];

function hashTag(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}

export function getTagVariant(tag: string): TagVariant {
  return explicit[tag.toLowerCase()] ?? fallbacks[hashTag(tag) % fallbacks.length];
}
