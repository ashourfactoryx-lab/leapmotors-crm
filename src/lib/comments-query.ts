import type { SupabaseClient } from "@supabase/supabase-js";
import { singleEmbed } from "@/lib/supabase-embed";

export type Comment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

const COMMENTS_SELECT = "id, body, created_at, author:profiles!author_id(full_name)";

type RawComment = {
  id: string;
  body: string;
  created_at: string;
  author: unknown;
};

function mapComment(r: RawComment): Comment {
  const author = singleEmbed<{ full_name: string }>(r.author);
  return {
    id: r.id,
    body: r.body,
    authorName: author?.full_name ?? "Unknown",
    createdAt: r.created_at,
  };
}

export async function fetchComments(supabase: SupabaseClient, apptId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("appt_comments")
    .select(COMMENTS_SELECT)
    .eq("appt_id", apptId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapComment);
}
