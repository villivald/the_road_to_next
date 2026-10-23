import { z } from "zod";

// The webhook and its worker must accept the same Paddle ID namespace.
export const billingEventIdSchema = () =>
  z
    .string()
    .regex(
      process.env.PADDLE_ENVIRONMENT === "sandbox"
        ? /^(?:evt|ntfsimevt)_[a-z0-9]{26}$/
        : /^evt_[a-z0-9]{26}$/,
    );
