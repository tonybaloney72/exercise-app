/** How the app resolves data repos and auth-gated features. */
export type AuthMode = "loading" | "authenticated" | "guest" | "anonymous";

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Repo backing: Supabase when authenticated, local storage otherwise. */
export type RepoAuthMode = "authenticated" | "guest";

export function repoAuthMode(mode: AuthMode): RepoAuthMode {
  return mode === "authenticated" ? "authenticated" : "guest";
}
