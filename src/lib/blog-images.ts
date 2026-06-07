import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "uploads", "blog");
const MAX_INPUT = 8 * 1024 * 1024;
const MAX_WEBP = 4 * 1024 * 1024;
const INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function ensureImageDir() {
  await mkdir(DIR, { recursive: true });
}

export async function saveBlogImage(
  data: Buffer,
  mime: string
): Promise<{ id: string; url: string }> {
  if (!INPUT_TYPES.has(mime)) throw new Error("Unsupported image type");
  if (data.length > MAX_INPUT) throw new Error("Image too large (max 8 MB)");

  const webp = await sharp(data, { animated: mime === "image/gif" })
    .webp({ quality: 82 })
    .toBuffer();

  if (webp.length > MAX_WEBP) throw new Error("Image too large after conversion");

  await ensureImageDir();
  const id = randomUUID();
  await writeFile(path.join(DIR, `${id}.webp`), webp);
  return { id, url: `/api/images/${id}` };
}

export async function loadBlogImage(id: string): Promise<Buffer | null> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  try {
    return await readFile(path.join(DIR, `${id}.webp`));
  } catch {
    return null;
  }
}
