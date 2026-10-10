import { describe, expect, it } from "vitest";
import {
  emailSchema,
  newPasswordSchema,
  signUpSchema,
} from "@/features/auth/service/schemas";

describe("account input validation", () => {
  it("normalizes email before uniqueness and rate-limit checks", () => {
    expect(emailSchema.parse("  Person@EXAMPLE.com ")).toBe(
      "person@example.com",
    );
  });
  it("requires strong matching passwords when registering", () => {
    const input = {
      username: "demo",
      email: "person@example.com",
      password: "A-long-password!",
      confirmPassword: "A-long-password!",
    };
    expect(signUpSchema.safeParse(input).success).toBe(true);
    expect(
      signUpSchema.safeParse({
        ...input,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        ...input,
        confirmPassword: "different-password",
      }).success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({
        password: "x".repeat(129),
        confirmPassword: "x".repeat(129),
      }).success,
    ).toBe(false);
  });
});
