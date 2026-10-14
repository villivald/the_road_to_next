export type BackfillStage =
  "read-source" | "generate-variants" | "write-files" | "activate";

export const backfillFailureMessage = (
  stage: BackfillStage,
  error: unknown,
) => {
  const details = error instanceof Error ? error.message : "";
  if (/\b403\b|forbidden/i.test(details)) {
    return "Storage access denied (403). Check the Blob read-write credentials.";
  }
  if (/\b401\b|unauthorized/i.test(details)) {
    return "Storage authentication failed (401). Check the Blob read-write credentials.";
  }
  if (stage === "read-source" && details === "Source image unavailable") {
    return "The source file was not found in storage.";
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  if (typeof code === "string" && /^P\d{4}$/.test(code)) {
    return `Database operation failed (${code}).`;
  }
  // Never print raw provider/database errors: they may contain credentials or paths.
  return {
    "read-source":
      "The source image could not be read. Check storage and connectivity.",
    "generate-variants":
      "Image variants could not be generated. Check the source image.",
    "write-files":
      "Image files could not be stored. Check storage and connectivity.",
    activate:
      "The image update could not be committed. Check the database connection.",
  }[stage];
};
