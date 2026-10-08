"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import shell from "@/components/shell.module.css";
import { MAX_IMAGE_BYTES } from "../types";
import styles from "./media.module.css";

export type SelectedImage = { file: File; alt: string };
const subscribe = () => () => {};

export function ImagePicker({
  value,
  onChange,
  resetKey,
}: {
  value: SelectedImage | null;
  onChange: (image: SelectedImage | null) => void;
  resetKey: number;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const file = value?.file;

  useEffect(() => {
    // Restore the native selection after React resets a form with validation errors.
    if (file && input.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.current.files = transfer.files;
    }
  }, [file, resetKey]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    const message = file
      ? file.size > MAX_IMAGE_BYTES
        ? "Choose an image up to 3 MB."
        : !["image/jpeg", "image/png", "image/webp"].includes(file.type)
          ? "Choose a JPEG, PNG, or WebP image."
          : ""
      : "";

    event.currentTarget.setCustomValidity(message);
    setError(message);
    setPreviewUrl(file && !message ? URL.createObjectURL(file) : null);
    onChange(file && !message ? { file, alt: value?.alt ?? "" } : null);
  };

  const clear = () => {
    if (input.current) {
      input.current.value = "";
      input.current.setCustomValidity("");
    }
    setError("");
    setPreviewUrl(null);
    onChange(null);
  };

  return (
    <div className={styles.picker}>
      <div className={shell.field}>
        <label htmlFor={`${id}-file`}>Image (optional)</label>
        <input
          ref={input}
          id={`${id}-file`}
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          disabled={!ready}
          onChange={select}
          aria-invalid={!!error}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        />
        <p id={`${id}-help`} className={shell["field-help"]}>
          One JPEG, PNG, or WebP, up to 3 MB and 20 megapixels. Saved with your
          wish and resized automatically.
        </p>
        {error && (
          <p id={`${id}-error`} role="alert" className={shell["error-text"]}>
            {error}
          </p>
        )}
      </div>
      {value && previewUrl && (
        <>
          <Image
            src={previewUrl}
            alt={value.alt || "Selected image preview"}
            width={640}
            height={480}
            unoptimized
            className={styles.thumbnail}
          />
          <p className={styles.filename}>{value.file.name}</p>
          <div className={shell.field}>
            <label htmlFor={`${id}-alt`}>Image description (optional)</label>
            <input
              id={`${id}-alt`}
              name="imageAlt"
              maxLength={300}
              value={value.alt}
              onChange={(event) =>
                onChange({ ...value, alt: event.currentTarget.value })
              }
              aria-describedby={`${id}-alt-help`}
            />
            <p id={`${id}-alt-help`} className={shell["field-help"]}>
              Describe the image for people using screen readers. If blank, your
              wish title is used.
            </p>
          </div>
        </>
      )}
      {(value || error) && (
        <button
          type="button"
          className={shell["secondary-button"]}
          onClick={clear}
        >
          Remove selected image
        </button>
      )}
    </div>
  );
}
