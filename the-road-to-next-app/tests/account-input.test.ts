import { describe, expect, it } from "vitest";
import {
  deleteAccountSchema,
  profileSchema,
} from "@/features/account/service/schemas";

describe("account input", () => {
  it("accepts international profile text and strips identity and credential fields", () => {
    expect(
      profileSchema.parse({
        name: "  李 Müller  ",
        description: "  Books\nand art  ",
        userId: "other",
        email: "other@example.test",
        passwordHash: "other",
      }),
    ).toEqual({ name: "李 Müller", description: "Books\nand art" });
  });
  it("allows clearing optional fields but bounds profile text", () => {
    expect(profileSchema.parse({ name: " ", description: "" })).toEqual({
      name: "",
      description: "",
    });
    expect(
      profileSchema.safeParse({ name: "x".repeat(81), description: "" })
        .success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ name: "", description: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
  it("requires a bounded password, exact confirmation and an impact fingerprint", () => {
    const input = {
      password: "current-password",
      confirmation: "DELETE",
      impactToken: "a".repeat(64),
    };
    expect(deleteAccountSchema.safeParse(input).success).toBe(true);
    for (const change of [
      { password: "" },
      { password: "x".repeat(129) },
      { confirmation: "delete" },
      { impactToken: "tampered" },
    ]) {
      expect(
        deleteAccountSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
    }
  });
});
