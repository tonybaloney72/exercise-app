export type AuthErrorContext = "login" | "signup" | "password" | "reset";

export function humanizeAuthError(
  message: string,
  context: AuthErrorContext,
): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (context === "login") {
    if (lower.includes("invalid login credentials")) {
      return "That email and password don't match. Try again.";
    }
    if (lower.includes("email not confirmed")) {
      return "Please confirm your email address before logging in.";
    }
  }

  if (context === "signup") {
    if (lower.includes("already registered") || lower.includes("user already")) {
      return "An account with that email already exists. Try logging in.";
    }
    if (lower.includes("password should be")) {
      return "Password is too short. Use at least 8 characters.";
    }
  }

  if (context === "password") {
    if (lower.includes("same") && lower.includes("password")) {
      return "New password must be different from your current one.";
    }
    if (lower.includes("password should be") || lower.includes("at least")) {
      return "Password is too short. Use at least 8 characters.";
    }
    if (lower.includes("auth session missing")) {
      return "Your reset link has expired. Please request a new one.";
    }
  }

  return message;
}
