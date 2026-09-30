import { flattenError, ZodError } from "zod";

export type ActionState<T = unknown> = {
  status?: string;

  message: string;

  payload?: FormData;

  fieldErrors: Record<string, string[] | undefined>;
  timestamp: number;
  data?: T;
};

export const EMPTY_ACTION_STATE: ActionState = {
  status: "",
  message: "",
  fieldErrors: {},
  payload: undefined,
  timestamp: Date.now(),
};

const safePayload = (formData?: FormData) => {
  if (!formData) return undefined;
  const payload = new FormData();
  for (const [key, value] of formData) {
    if (!/password|token|code|^\$ACTION/i.test(key)) payload.append(key, value);
  }
  return payload;
};

export const toActionState = (
  status: ActionState["status"],
  message: string,
  formData?: FormData,
  data?: unknown,
): ActionState => ({
  status,
  message,
  fieldErrors: {},
  timestamp: Date.now(),
  payload: safePayload(formData),
  data,
});

export const fromErrorToActionState = (
  error: unknown,
  formData?: FormData,
): ActionState => {
  if (error instanceof ZodError) {
    const errors = flattenError(error);
    return {
      status: "ERROR",
      message: errors.formErrors.join(" "),
      fieldErrors: errors.fieldErrors,
      payload: safePayload(formData),
      timestamp: Date.now(),
    };
  } else if (error instanceof Error) {
    // Never expose database or provider details to the browser.
    return {
      status: "ERROR",
      message: "Something went wrong. Please try again.",
      fieldErrors: {},
      payload: safePayload(formData),
      timestamp: Date.now(),
    };
  } else {
    // Unknown error, return a generic message
    return {
      status: "ERROR",
      message: "Something went wrong. Please try again.",
      fieldErrors: {},
      payload: safePayload(formData),
      timestamp: Date.now(),
    };
  }
};
