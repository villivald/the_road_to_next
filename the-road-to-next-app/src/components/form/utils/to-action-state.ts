import { ZodError } from "zod";

export type ActionState = {
  status?: string;
  message: string;
  payload?: FormData;
  fieldErrors: Record<string, string[] | undefined>;
  timestamp: number;
};

export const EMPTY_ACTION_STATE: ActionState = {
  message: "",
  fieldErrors: {},
  timestamp: Date.now(),
};

export const toActionState = (
  status: ActionState["status"],
  message: string,
  formData?: FormData,
): ActionState => ({
  status,
  message,
  fieldErrors: {},
  timestamp: Date.now(),
  payload: formData,
});

export const fromErrorToActionState = (error: unknown, formData?: FormData) => {
  if (error instanceof ZodError) {
    // Zod validation error, return the first error message
    return {
      status: "ERROR",
      message: "",
      fieldErrors: error.flatten().fieldErrors,
      payload: formData,
      timestamp: Date.now(),
    };
  } else if (error instanceof Error) {
    // General error (db, orm), return the error message
    return {
      status: "ERROR",
      message: error.message,
      fieldErrors: {},
      payload: formData,
      timestamp: Date.now(),
    };
  } else {
    // Unknown error, return a generic message
    return {
      status: "ERROR",
      message: "An unknown error occured",
      fieldErrors: {},
      payload: formData,
      timestamp: Date.now(),
    };
  }
};
