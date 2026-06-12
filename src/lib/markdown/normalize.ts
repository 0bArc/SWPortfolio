/** CRLF → LF for stable block offsets and saves. */
export function normalizeMarkdownNewlines(md: string): string {
  return md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
