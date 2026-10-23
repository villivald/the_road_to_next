import { z } from "zod";
import { getBaseUrl } from "@/utils/url";
import { AuthError } from "./security";

export type AccountChallenge =
  "sign_up" | "password_recovery" | "verification_resend";

const unavailable =
  "Account protection is temporarily unavailable. Please try again shortly.";
const rejected = "Please complete the security check and try again.";
const verificationSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
});

export const verifyAccountChallenge = async (
  data: FormData,
  action: AccountChallenge,
) => {
  if (data.getAll("website").some((value) => value !== "")) {
    throw new AuthError(rejected);
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Local development without keys retains native forms and local mail capture.
  // Hosted deployments and partially configured local setups must fail closed.
  if (!process.env.VERCEL && !siteKey && !secret) return;
  if (!siteKey || !secret) {
    console.error("Account protection configuration is incomplete");
    throw new AuthError(unavailable);
  }

  const tokens = data.getAll("cf-turnstile-response");
  const token = tokens[0];
  if (
    tokens.length !== 1 ||
    typeof token !== "string" ||
    !token.trim() ||
    token.length > 2048
  ) {
    throw new AuthError(rejected);
  }

  let result: z.infer<typeof verificationSchema>;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: token }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) throw new Error("Challenge provider unavailable");
    result = verificationSchema.parse(await response.json());
  } catch {
    console.error("Account protection verification unavailable");
    throw new AuthError(unavailable);
  }

  if (
    !result.success ||
    result.action !== action ||
    result.hostname !== new URL(getBaseUrl()).hostname
  ) {
    throw new AuthError(rejected);
  }
};
