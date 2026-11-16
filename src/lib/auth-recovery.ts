/** Only an explicit recovery callback should interrupt normal sign-in. */
export function isRecoveryCallback(hash: string) {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

export const RECOVERY_MARKER = "veya-password-recovery";

export function canSetRecoveryPassword(recovery: boolean, verifiedEmail: boolean) {
  return recovery && verifiedEmail;
}

export function passwordResetError(password: string, confirmation: string) {
  if (password.length < 6) return "Use at least 6 characters.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}