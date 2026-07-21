"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/auth-username";

export type LoginState = { error: string } | null;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error || !data.user) {
    return { error: "That username and password don’t match. Try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .single();

  if (profile?.status && profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "This account is no longer active. Contact your admin." };
  }

  redirect("/");
}
