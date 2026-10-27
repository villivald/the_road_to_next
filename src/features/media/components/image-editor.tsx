"use client";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useSaveConfirmation } from "@/components/form/feedback-provider";
import shell from "@/components/shell.module.css";
import { notifyFormSaved } from "@/i18n/form-changes";
import { useRouter } from "@/i18n/navigation";
import { useText } from "@/i18n/use-text";
import {
  MAX_IMAGE_BYTES,
  type MediaImage as ImageDetails,
  type MediaTarget,
} from "../types";
import { ImageUploadGuidance } from "./image-upload-guidance";
import styles from "./media.module.css";
import { MediaImage } from "./media-image";

export function ImageEditor({
  target,
  image,
  label = "Image",
  fallbackAlt,
}: {
  target: MediaTarget;
  image: ImageDetails | null;
  label?: string;
  fallbackAlt?: string;
}) {
  const t = useText();
  const notify = useSaveConfirmation();

  const router = useRouter();
  const id = useId();
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (feedback?.error) {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const remove =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "remove";
    const file = values.get("image");

    if (
      !remove &&
      (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES)
    ) {
      setFeedback({
        error: true,
        message: "Choose an image up to 3 MB.",
      });
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      const query = new URLSearchParams({
        ...target,
      });
      const response = await fetch(`/api/media?${query}`, {
        method: remove ? "DELETE" : "POST",
        headers: {
          "X-Image-Description": encodeURIComponent(
            String(values.get("alt") ?? "").trim() || fallbackAlt || "",
          ),
        },
        body: remove ? undefined : (file as File),
      });
      const result = await response.json();
      setFeedback(
        response.ok ? null : { error: true, message: result.message },
      );

      if (response.ok) {
        notifyFormSaved(form);
        const button = (event.nativeEvent as SubmitEvent).submitter;
        notify(
          t.message(result.message),
          button instanceof HTMLElement ? button : null,
        );
        form.reset();
        router.refresh();
      }
    } catch {
      setFeedback({
        error: true,
        message:
          "The image could not be updated. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className={styles.editor}
      aria-labelledby={`${id}-heading`}
      data-target={target.kind}
    >
      <h2 id={`${id}-heading`}>{t.message(label)}</h2>
      <MediaImage
        image={image}
        compact
        sizes={target.kind === "avatar" ? "112px" : undefined}
      />
      <ImageUploadGuidance kind={target.kind} id={`${id}-help`} />
      {feedback?.error && (
        <p ref={feedbackRef} tabIndex={-1} role="alert" className={shell.error}>
          <span>{t.message(feedback.message)}</span>
        </p>
      )}
      <form onSubmit={submit} className={shell.form}>
        <fieldset disabled={pending} className={shell["form-fields"]}>
          <div className={shell.field}>
            <label htmlFor={`${id}-file`}>
              {image ? t("Replacement image") : t("Choose image")}
            </label>
            <input
              id={`${id}-file`}
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={`${id}-help`}
            />
          </div>
          <div className={shell.field}>
            <label htmlFor={`${id}-alt`}>{t("Image description")}</label>
            <input
              key={image?.id ?? "empty"}
              id={`${id}-alt`}
              name="alt"
              required={!fallbackAlt}
              maxLength={300}
              defaultValue={image?.alt ?? ""}
              aria-describedby={`${id}-description-help`}
            />
            <p className={shell.muted} id={`${id}-description-help`}>
              {t("Briefly describe the image for people using screen readers.")}
              {fallbackAlt && (
                <> {t("Optional: if blank, your wish title is used.")}</>
              )}
            </p>
          </div>
          <div className={shell.actions}>
            <button type="submit" className={shell.button}>
              {pending
                ? t("Saving…")
                : image
                  ? t("Replace image")
                  : t("Upload image")}
            </button>
            {image && (
              <button
                type="submit"
                value="remove"
                formNoValidate
                className={shell["secondary-button"]}
              >
                {t("Remove image")}
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
