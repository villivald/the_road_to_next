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
    if (!/password/i.test(key)) payload.append(key, value);
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
    // Zod validation error, return the first error message
    return {
      status: "ERROR",
      message: "",
      fieldErrors: flattenError(error).fieldErrors,
      payload: safePayload(formData),
      timestamp: Date.now(),
    };
  } else if (error instanceof Error) {
    // General error (db, orm), return the error message
    return {
      status: "ERROR",
      message: error.message,
      fieldErrors: {},
      payload: safePayload(formData),
      timestamp: Date.now(),
    };
  } else {
    // Unknown error, return a generic message
    return {
      status: "ERROR",
      message: "An unknown error occured",
      fieldErrors: {},
      payload: safePayload(formData),
      timestamp: Date.now(),
    };
  }
};
