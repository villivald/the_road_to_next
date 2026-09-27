import { eventType, Inngest, staticSchema } from "inngest";
import type { AttachmentDeleteEventArgs } from "@/features/attachments/events/event-attachment-deleted";
import type { EmailVerificationEventArgs } from "@/features/auth/events/event-email-verification";
import type { InvitationCreateEventArgs } from "@/features/invitation/events/event-invitation-event";
import type { PasswordResetEventArgs } from "@/features/password/events/event-password-reset";

export const passwordResetRequested = eventType("app/password.password-reset", {
  schema: staticSchema<PasswordResetEventArgs["data"]>(),
});
export const signedUp = eventType("app/auth.sign-up", {
  schema: staticSchema<EmailVerificationEventArgs["data"]>(),
});
export const invitationCreated = eventType("app/invitation.created", {
  schema: staticSchema<InvitationCreateEventArgs["data"]>(),
});
export const attachmentDeleted = eventType("app/attachment.deleted", {
  schema: staticSchema<AttachmentDeleteEventArgs["data"]>(),
});

export const inngest = new Inngest({
  id: "the-road-to-next",
  checkpointing: false,
});
