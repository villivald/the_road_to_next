import type { ReactElement } from "react";
import { render } from "react-email";
import { resend } from "./resend";

export const deliverEmail = async (
  to: string,
  subject: string,
  react: ReactElement,
  idempotencyKey?: string,
) => {
  const html = await render(react);
  const text = await render(react, { plainText: true });
  return deliverRenderedEmail({ to, subject, html, text }, idempotencyKey);
};

export const emailSender = () =>
  process.env.EMAIL_FROM ?? "Wishlist <onboarding@resend.dev>";

export const deliverRenderedEmail = async (
  message: {
    to: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
  },
  idempotencyKey?: string,
) => {
  const localInbox = process.env.MAILPIT_URL;
  const localInboxUrl = localInbox ? new URL(localInbox) : null;

  if (localInboxUrl) {
    if (
      process.env.VERCEL ||
      !["localhost", "127.0.0.1", "[::1]"].includes(localInboxUrl.hostname)
    ) {
      throw new Error("Local email capture requires a local server");
    }
  }

  if (localInboxUrl) {
    const response = await fetch(new URL("/api/v1/send", localInboxUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: "noreply@example.test", Name: "Wishlist" },
        To: [{ Email: message.to }],
        Subject: message.subject,
        HTML: message.html,
        Text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error("Local email delivery failed");
    }

    return { error: null };
  }

  const result = await resend.emails.send(
    {
      from: message.from ?? emailSender(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  if (result.error) {
    console.error("Resend email delivery failed", {
      statusCode: result.error.statusCode,
    });
    throw new Error("Email delivery failed");
  }

  return { error: null };
};
