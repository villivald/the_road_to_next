import { z } from "zod";
import { type BillingEnvironment, billingEnvironment } from "./config";

// The webhook and its worker must accept the same Paddle ID namespace.
export const billingEventIdSchema = (
  environment: BillingEnvironment | null = billingEnvironment(),
) =>
  z
    .string()
    .regex(
      environment === "sandbox"
        ? /^(?:evt|ntfsimevt)_[a-z0-9]{26}$/
        : /^evt_[a-z0-9]{26}$/,
    );
