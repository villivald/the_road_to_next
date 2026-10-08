export const homePath = "/";

export const browsePath = "/browse";

export const listsPath = "/lists";
export const sharedListsPath = "/lists/shared";
export const invitationPath = (id: string) =>
  `/invitations/${encodeURIComponent(id)}`;
export const sharingPath = (id: string) => `${listPath(id)}/sharing`;
export const guestLinksPath = (id: string) => `${listPath(id)}/guest-links`;
export const guestListPath = (id: string) =>
  `/guest/lists/${encodeURIComponent(id)}`;
export const guestWishPath = (listId: string, wishId: string) =>
  `${guestListPath(listId)}/wishes/${encodeURIComponent(wishId)}`;

export const reservationsPath = "/reservations";

export const newListPath = `${listsPath}/new`;

export const listPath = (id: string) =>
  `${listsPath}/${encodeURIComponent(id)}`;

export const listSettingsPath = (id: string) => `${listPath(id)}/edit`;

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

export const accountDeletePath = "/account/delete";

export const accountPlanPath = "/account/plan";
