import { z } from "zod";
import { emailSchema } from "@/features/auth/service/schemas";

export const invitationSchema = z.object({
  email: emailSchema,
  role: z.enum(["MEMBER", "ADMIN"]),
});

export const roleSchema = z.enum(["MEMBER", "ADMIN"]);
export const visibilitySchema = z.enum(["PUBLIC", "PRIVATE"]);
export const sharingPage = (input: unknown) => {
  const page = Number(input);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
};
