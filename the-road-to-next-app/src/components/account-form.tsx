"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { emailVerification } from "@/features/auth/actions/email-verification";
import { emailVerificationResend } from "@/features/auth/actions/email-verification-resend";
import { signIn } from "@/features/auth/actions/sign-in";
import { signUp } from "@/features/auth/actions/sign-up";
import { passwordChange } from "@/features/password/actions/password-change";
import { passwordForgot } from "@/features/password/actions/password-forgot";
import { passwordReset } from "@/features/password/actions/password-reset";
import styles from "./shell.module.css";

const actions = {
  signIn,
  signUp,
  emailVerification,
  emailVerificationResend,
  passwordChange,
  passwordForgot,
  passwordReset,
};

type Mode = keyof typeof actions;

type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  hint?: string;
};

const email: Field = {
  name: "email",
  label: "Email",
  type: "email",
  autoComplete: "email",
  maxLength: 254,
};

const password: Field = {
  name: "password",
  label: "Password",
  type: "password",
  autoComplete: "new-password",
  minLength: 12,
  maxLength: 128,
  hint: "Use 12–128 characters.",
};

const confirmation: Field = {
  ...password,
  name: "confirmPassword",
  label: "Confirm password",
  hint: undefined,
};

const fields: Record<Mode, Field[]> = {
  signIn: [
    email,
    {
      ...password,
      autoComplete: "current-password",
      minLength: 1,
      hint: undefined,
    },
  ],
  signUp: [
    {
      name: "username",
      label: "Username",
      autoComplete: "username",
      minLength: 2,
      maxLength: 40,
      hint: "Letters, numbers, underscores, and hyphens.",
    },
    email,
    password,
    confirmation,
  ],
  emailVerification: [
    {
      name: "code",
      label: "Verification code",
      autoComplete: "one-time-code",
      minLength: 8,
      maxLength: 8,
      hint: "Enter the eight letters from your latest email.",
    },
  ],
  emailVerificationResend: [],
  passwordForgot: [email],
  passwordReset: [password, confirmation],
  passwordChange: [
    {
      ...password,
      name: "currentPassword",
      label: "Current password",
      autoComplete: "current-password",
      minLength: 1,
      hint: undefined,
    },
    { ...password, label: "New password" },
    confirmation,
  ],
};

const labels: Record<Mode, string> = {
  signIn: "Sign in",
  signUp: "Create account",
  emailVerification: "Verify email",
  emailVerificationResend: "Send a new code",
  passwordForgot: "Send reset link",
  passwordReset: "Reset password",
  passwordChange: "Change password",
};

export function AccountForm({
  mode,
  tokenId,
  returnTo,
}: {
  mode: Mode;
  tokenId?: string;
  returnTo?: string;
}) {
  const [state, action, pending] = useActionState(actions[mode], {
    ...EMPTY_ACTION_STATE,
    timestamp: 0,
  });
  const prefix = useId();
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "ERROR") feedback.current?.focus();
  }, [state.timestamp, state.status]);
  const hasErrors = Object.values(state.fieldErrors).some(
    (errors) => errors?.length,
  );
  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {tokenId && <input type="hidden" name="tokenId" value={tokenId} />}
      {(state.message || hasErrors) && (
        <div
          ref={feedback}
          tabIndex={-1}
          role={state.status === "ERROR" ? "alert" : "status"}
          className={state.status === "ERROR" ? styles.error : styles.notice}
        >
          {state.message || "Please check the highlighted fields."}
        </div>
      )}
      {fields[mode].map((field) => {
        const id = `${prefix}-${field.name}`;
        const errors = state.fieldErrors[field.name];
        const value = state.payload?.get(field.name);
        return (
          <div key={field.name} className={styles.field}>
            <label htmlFor={id}>{field.label}</label>
            <input
              key={state.timestamp}
              id={id}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              minLength={field.minLength}
              maxLength={field.maxLength}
              required
              defaultValue={typeof value === "string" ? value : ""}
              aria-invalid={!!errors?.length}
              aria-describedby={
                errors?.length || field.hint ? `${id}-help` : undefined
              }
            />
            {(errors?.length || field.hint) && (
              <p
                id={`${id}-help`}
                className={errors?.length ? styles["error-text"] : styles.muted}
              >
                {errors?.join(" ") ?? field.hint}
              </p>
            )}
          </div>
        );
      })}
      <button
        className={
          mode === "emailVerificationResend"
            ? styles["secondary-button"]
            : styles.button
        }
        disabled={pending}
        type="submit"
      >
        {pending ? "Please wait…" : labels[mode]}
      </button>
    </form>
  );
}
