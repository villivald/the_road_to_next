"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ActionState,
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { prisma } from "@/lib/prisma";
import { ticketPath } from "@/paths";

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

export const updateComment = async (
  commentId: string,
  _actionState: ActionState,
  formData: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  let data;

  try {
    data = updateCommentSchema.parse(Object.fromEntries(formData));

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment || comment.userId !== user.id) {
      throw new Error("You are not authorized to update this comment");
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { content: data.content },
    });
  } catch (error) {
    return fromErrorToActionState(error);
  }

  revalidatePath(ticketPath(commentId));

  return toActionState(
    "SUCCESS",
    "Comment updated successfully",
    undefined,
    data.content,
  );
};
