import { ZodError } from "zod";
import {
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { AuthError } from "./security";

export const authActionError = (error: unknown, data?: FormData) => {
  if (error instanceof ZodError) {
    return fromErrorToActionState(error, data);
  }

  if (error instanceof AuthError) {
    return toActionState("ERROR", error.message, data);
  }

  console.error("Account operation failed");

  return toActionState(
    "ERROR",
    "Something went wrong. Please try again.",
    data,
  );
};
