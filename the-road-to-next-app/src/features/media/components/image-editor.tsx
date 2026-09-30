"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import shell from "@/components/shell.module.css";
import {
  MAX_IMAGE_BYTES,
  type MediaImage as ImageDetails,
  type MediaTarget,
} from "../types";
import styles from "./media.module.css";
import { MediaImage } from "./media-image";

export function ImageEditor({
  target,
  image,
  label = "Image",
}: {
  target: MediaTarget;
  image: ImageDetails | null;
  label?: string;
}) {
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
        message: "Choose an image smaller than 3 MB.",
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
            String(values.get("alt") ?? ""),
          ),
        },
        body: remove ? undefined : (file as File),
      });
      const result = await response.json();
      setFeedback({ error: !response.ok, message: result.message });

      if (response.ok) {
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
    <section className={styles.editor} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{label}</h2>
      <MediaImage image={image} compact />
      <p className={shell.muted} id={`${id}-help`}>
        One JPEG, PNG, or WebP, up to 3 MB and 20 megapixels. Images are resized
        automatically.
      </p>
      {feedback && (
        <p
          ref={feedbackRef}
          tabIndex={-1}
          role={feedback.error ? "alert" : "status"}
          className={feedback.error ? shell.error : shell.notice}
        >
          {feedback.message}
        </p>
      )}
      <form onSubmit={submit} className={shell.form}>
        <fieldset disabled={pending} className={shell["form-fields"]}>
          <div className={shell.field}>
            <label htmlFor={`${id}-file`}>
              {image ? "Replacement image" : "Choose image"}
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
            <label htmlFor={`${id}-alt`}>Image description</label>
            <input
              key={image?.id ?? "empty"}
              id={`${id}-alt`}
              name="alt"
              required
              maxLength={300}
              defaultValue={image?.alt ?? ""}
              aria-describedby={`${id}-description-help`}
            />
            <p className={shell.muted} id={`${id}-description-help`}>
              Briefly describe the image for people using screen readers.
            </p>
          </div>
          <div className={shell.actions}>
            <button type="submit" className={shell.button}>
              {pending ? "Saving…" : image ? "Replace image" : "Upload image"}
            </button>
            {image && (
              <button
                type="submit"
                value="remove"
                formNoValidate
                className={shell["secondary-button"]}
              >
                Remove image
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
