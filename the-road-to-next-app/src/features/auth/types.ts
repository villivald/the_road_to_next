import type { User } from "@/generated/prisma/browser";

export type AuthUser = Pick<
  User,
  "id" | "username" | "email" | "emailVerified"
>;
