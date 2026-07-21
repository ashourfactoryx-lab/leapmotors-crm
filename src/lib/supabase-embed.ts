// Supabase's embedded-resource type inference (without generated DB types)
// can't always tell a to-one relationship from a to-many one, so a joined
// field sometimes comes back as an array of one instead of a single object.
export function singleEmbed<T>(value: unknown): T | null {
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}
