"use client";
import { type ReactNode, useActionState, useId, useState } from "react";
import { ActionFeedback } from "@/components/form/action-feedback";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import styles from "@/components/shell.module.css";
import {
  ImagePicker,
  type SelectedImage,
} from "@/features/media/components/image-picker";
import { Link } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import { listPath, wishPath } from "@/paths";
import { addWish, editWish } from "../actions/manage-wish";
import { currencies, priceInputValue, type WishCurrency } from "../utils/money";

type WishValues = {
  id: string;
  title: string;
  description: string | null;
  externalUrl: string | null;
  priceMinor: number | null;
  currency: WishCurrency | null;
  priority: number | null;
  hidden: boolean;
};

function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
}) {
  const t = useText();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      <p
        id={`${id}-help`}
        className={errors?.length ? styles["error-text"] : styles.muted}
      >
        {errors?.map(t.message).join(" ") ?? hint}
      </p>
    </div>
  );
}

export function WishForm({
  listId,
  wish,
}: {
  listId: string;
  wish?: WishValues;
}) {
  const t = useText();

  const [image, setImage] = useState<SelectedImage | null>(null);
  const [state, action, pending] = useActionState(
    wish ? editWish.bind(null, listId, wish.id) : addWish.bind(null, listId),
    { ...EMPTY_ACTION_STATE, timestamp: 0 },
  );
  const prefix = useId();
  const defaults = {
    title: wish?.title ?? "",
    description: wish?.description ?? "",
    externalUrl: wish?.externalUrl ?? "",
    price: priceInputValue(wish?.priceMinor ?? null),
    currency: wish?.currency ?? "",
    priority: wish?.priority?.toString() ?? "",
  };

  const fieldProps = (name: keyof typeof defaults) => {
    const value = state.payload?.get(name);

    return {
      id: `${prefix}-${name}`,
      name,
      defaultValue: typeof value === "string" ? value : defaults[name],
      "aria-invalid": !!state.fieldErrors[name]?.length,
      "aria-describedby": `${prefix}-${name}-help`,
    };
  };

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <ActionFeedback state={state} />

      <fieldset
        key={state.timestamp}
        disabled={pending}
        className={styles["form-fields"]}
      >
        <legend className={styles["visually-hidden"]}>
          {t("Wish details")}
        </legend>

        <Field
          id={`${prefix}-title`}
          label={t("Title")}
          hint={t("The only required field. Up to 200 characters.")}
          errors={state.fieldErrors.title}
        >
          <input {...fieldProps("title")} required maxLength={200} />
        </Field>

        <Field
          id={`${prefix}-description`}
          label={t("Description (optional)")}
          hint={t(
            "Details, sizes, or anything worth remembering. Up to 4,000 characters.",
          )}
          errors={state.fieldErrors.description}
        >
          <textarea {...fieldProps("description")} rows={4} maxLength={4000} />
        </Field>

        <Field
          id={`${prefix}-externalUrl`}
          label={t("Product link (optional)")}
          hint={t("A full link starting with https:// or http://.")}
          errors={state.fieldErrors.externalUrl}
        >
          <input {...fieldProps("externalUrl")} type="url" maxLength={2048} />
        </Field>

        <div className={styles["form-row"]}>
          <Field
            id={`${prefix}-price`}
            label={t("Price (optional)")}
            hint={t("For example, 12.50 or 12,50. Leave blank for no price.")}
            errors={state.fieldErrors.price}
          >
            <input
              {...fieldProps("price")}
              inputMode="decimal"
              maxLength={20}
            />
          </Field>

          <Field
            id={`${prefix}-currency`}
            label={t("Currency")}
            hint={t("Required only when a price is entered.")}
            errors={state.fieldErrors.currency}
          >
            <select {...fieldProps("currency")}>
              <option value="">{t("Choose a currency")}</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id={`${prefix}-priority`}
          label={t("Priority (optional)")}
          hint={t("Five stars is the highest priority.")}
          errors={state.fieldErrors.priority}
        >
          <select {...fieldProps("priority")}>
            <option value="">{t("No priority")}</option>
            {[1, 2, 3, 4, 5].map((priority) => (
              <option key={priority} value={priority}>
                {t.plural("{count} star", "{count} stars", priority)}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <label className={styles["checkbox-label"]}>
            <input
              type="checkbox"
              name="hidden"
              defaultChecked={
                state.payload
                  ? state.payload.get("hidden") === "on"
                  : (wish?.hidden ?? false)
              }
              aria-describedby={`${prefix}-hidden-help`}
            />
            {t("Hide this wish")}
          </label>
          <p id={`${prefix}-hidden-help`} className={styles.muted}>
            {t(
              "Only list admins can see hidden wishes. Hiding a wish ends its active reservation.",
            )}
          </p>
        </div>
      </fieldset>
      {!wish && (
        <fieldset disabled={pending} className={styles["form-fields"]}>
          <legend className={styles["visually-hidden"]}>
            {t("Wish image")}
          </legend>
          <ImagePicker
            value={image}
            onChange={setImage}
            resetKey={state.timestamp}
          />
        </fieldset>
      )}
      <div className={styles.actions}>
        <button type="submit" disabled={pending} className={styles.button}>
          {pending ? t("Saving…") : wish ? t("Save changes") : t("Add wish")}
        </button>
        <Link href={wish ? wishPath(listId, wish.id) : listPath(listId)}>
          {t("Cancel")}
        </Link>
      </div>
    </form>
  );
}
