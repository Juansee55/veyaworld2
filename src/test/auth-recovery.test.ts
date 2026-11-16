import { describe, expect, it } from "vitest";
import { canSetRecoveryPassword, isRecoveryCallback, passwordResetError } from "@/lib/auth-recovery";

describe("password recovery", () => {
  it("distinguishes recovery from signup and ordinary sign-in callbacks", () => {
    expect(isRecoveryCallback("#type=recovery&access_token=test")).toBe(true);
    expect(isRecoveryCallback("#type=signup&access_token=test")).toBe(false);
    expect(isRecoveryCallback("")).toBe(false);
  });
  it("rejects passwords shorter than the existing six-character minimum", () => {
    expect(passwordResetError("abcde", "abcde")).not.toBeNull();
    expect(passwordResetError("abcdef", "abcdef")).toBeNull();
  });
  it("rejects mismatched confirmation before changing a password", () => {
    expect(passwordResetError("abcdef", "abcdeg")).not.toBeNull();
  });
  it("requires both a recovery callback and confirmed email ownership", () => {
    expect(canSetRecoveryPassword(false, true)).toBe(false);
    expect(canSetRecoveryPassword(true, false)).toBe(false);
    expect(canSetRecoveryPassword(true, true)).toBe(true);
  });
});