import { describe, expect, it } from "vitest";
import { backfillFailureMessage } from "@/features/media/service/backfill-failure";

describe("backfill diagnostics", () => {
  it("identifies storage permission failures without printing provider details", () => {
    expect(
      backfillFailureMessage(
        "read-source",
        new Error("Vercel Blob: 403 Forbidden https://private.example/secret"),
      ),
    ).toBe(
      "Storage access denied (403). Check the Blob read-write credentials.",
    );
  });
  it("identifies missing source files", () => {
    expect(
      backfillFailureMessage(
        "read-source",
        new Error("Source image unavailable"),
      ),
    ).toBe("The source file was not found in storage.");
  });
  it("reports database codes without exposing queries or connection strings", () => {
    expect(
      backfillFailureMessage(
        "activate",
        Object.assign(new Error("postgresql://user:secret@example/db"), {
          code: "P2028",
        }),
      ),
    ).toBe("Database operation failed (P2028).");
  });
  it("redacts unexpected errors and untrusted codes", () => {
    expect(
      backfillFailureMessage(
        "write-files",
        Object.assign(new Error("token=secret"), { code: "token=secret" }),
      ),
    ).toBe("Image files could not be stored. Check storage and connectivity.");
  });
});
