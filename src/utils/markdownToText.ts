export function markdownToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/[*_#>`]+/g, "") // remove markdown symbols
    .replace(
      /$begin:math:display$([^$end:math:display$]+)\]$begin:math:text$(.*?)$end:math:text$/g,
      "$1"
    ) // links: keep text
    .replace(/\n{2,}/g, "\n") // collapse multiple newlines
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
}
