import { emailVerificationPath, homePath, listsPath } from "@/paths";

export const getHomePath = (user: { emailVerified: boolean } | null) =>
  user ? (user.emailVerified ? listsPath : emailVerificationPath) : homePath;
