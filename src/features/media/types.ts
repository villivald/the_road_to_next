export type MediaTarget =
  | { kind: "list"; listId: string }
  | { kind: "wish"; listId: string; wishId: string }
  | { kind: "avatar" };

export type MediaImage = {
  id: string;
  alt: string;
  width: number;
  height: number;
};

export const imageSelection = {
  select: { id: true, alt: true, width: true, height: true },
} as const;

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export class MediaError extends Error {}
