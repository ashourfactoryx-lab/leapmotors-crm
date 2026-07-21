const PALETTE = [
  "#0BD1A0", "#3B7BF6", "#8A6BF0", "#F5A623", "#F0524B", "#06A57E",
  "#C79A3B", "#5B6470", "#E0568C", "#2FB6C4", "#7C5CFF", "#E8873B",
];

export function agentColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % PALETTE.length;
  return PALETTE[hash];
}

export function initials(name: string): string {
  const clean = name.replace(/[^A-Za-z؀-ۿ ]/g, "");
  const parts = clean.split(" ").filter(Boolean).slice(0, 2);
  return (parts.map((p) => p[0]).join("") || name.slice(0, 2)).toUpperCase();
}
