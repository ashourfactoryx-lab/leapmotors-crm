"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { usernameToEmail } from "@/lib/auth-username";
import { generatePassword } from "@/lib/generate-password";

type CreatableRole = "agent" | "team_leader" | "showroom";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createAccount(input: {
  fullName: string;
  username: string;
  role: CreatableRole;
  agentCode: string;
}): Promise<ActionResult<{ username: string; password: string }>> {
  await requireAdmin();

  const fullName = input.fullName.trim();
  const username = input.username.trim().toLowerCase();
  if (!fullName || !username) {
    return { ok: false, error: "Fill in name and username." };
  }
  if (input.role === "agent" && !input.agentCode.trim()) {
    return { ok: false, error: "Agent code is required for agents." };
  }

  const admin = createAdminClient();
  const password = generatePassword();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    const taken = error?.message.toLowerCase().includes("registered");
    return { ok: false, error: taken ? "That username is taken." : (error?.message ?? "Failed to create account.") };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    username,
    role: input.role,
    agent_code: input.role === "agent" ? input.agentCode.trim().toUpperCase() : null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const taken = profileError.message.toLowerCase().includes("duplicate");
    return { ok: false, error: taken ? "That username or agent code is already taken." : profileError.message };
  }

  revalidatePath("/admin");
  return { ok: true, data: { username, password } };
}

export async function resetPassword(userId: string): Promise<ActionResult<{ password: string }>> {
  await requireAdmin();
  const admin = createAdminClient();
  const password = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { password } };
}

export async function setSuspended(userId: string, suspended: boolean): Promise<ActionResult<null>> {
  const session = await requireAdmin();
  if (userId === session.userId) return { ok: false, error: "You can't suspend your own account." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status: suspended ? "suspended" : "active" })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, data: null };
}

export async function removeAccount(userId: string): Promise<ActionResult<null>> {
  const session = await requireAdmin();
  if (userId === session.userId) return { ok: false, error: "You can't remove your own account." };

  const admin = createAdminClient();

  // Ban permanently rather than deleting the auth user outright:
  // appointments.assigned_agent is a NOT NULL, no-cascade FK to profiles, so
  // hard-deleting the login would cascade-delete the profile and then be
  // rejected by that constraint (or, if the FK graph were different, orphan
  // their appointment history). Banning disables sign-in forever while
  // keeping the profile — and every appointment attached to it — intact.
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (banError) return { ok: false, error: banError.message };

  const { error } = await admin.from("profiles").update({ status: "removed" }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, data: null };
}
