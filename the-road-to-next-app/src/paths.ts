export const homePath = "/";

export const emailVerificationPath = "/email-verification";

export const ticketsPath = "/tickets";
export const ticketPath = (id: string) => `/tickets/${id}`;
export const ticketEditPath = (id: string) => `/tickets/${id}/edit`;

export const signUpPath = "/sign-up";
export const signInPath = "/sign-in";
export const passwordForgotPath = "/password-forgot";
export const passwordResetPath = "/password-reset/";

export const accountProfilePath = "/account/profile";
export const accountPasswordPath = "/account/password";

export const organizationsPath = "/organization";
export const organizationCreatePath = "/organization/create";

export const onboardingPath = "/onboarding";
export const selectActiveOrganizationPath =
  "/onboarding/select-active-organization";
