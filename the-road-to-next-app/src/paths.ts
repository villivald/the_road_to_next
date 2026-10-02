export const homePath = "/";

export const browsePath = "/browse";

export const listsPath = "/lists";

export const reservationsPath = "/reservations";

export const newListPath = `${listsPath}/new`;

export const listPath = (id: string) =>
  `${listsPath}/${encodeURIComponent(id)}`;

export const newWishPath = (listId: string) => `${listPath(listId)}/wishes/new`;

export const wishPath = (listId: string, wishId: string) =>
  `${listPath(listId)}/wishes/${encodeURIComponent(wishId)}`;

export const signUpPath = "/sign-up";

export const signInPath = "/sign-in";

export const emailVerificationPath = "/email-verification";

export const passwordForgotPath = "/password-forgot";

export const passwordResetPath = "/password-reset/";

export const accountProfilePath = "/account/profile";

export const accountPasswordPath = "/account/password";
