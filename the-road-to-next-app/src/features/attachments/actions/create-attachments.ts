"use server";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ActionState,
  fromErrorToActionState,
  toActionState,
} from "@/components/form/utils/to-action-state";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { isOwner } from "@/features/auth/utils/is-owner";
import { s3 } from "@/lib/aws";
import { prisma } from "@/lib/prisma";
import { ticketPath } from "@/paths";
import { ACCEPTED, MAX_SIZE } from "../constants";
import { generateS3Key } from "../utils/generate-s3-key";
import { sizeInMb } from "../utils/size";

const createAttachmentsSchema = z.object({
  files: z
    .custom<FileList>()
    .transform((files) => Array.from(files))
    .transform((files) => files.filter((file) => file.size > 0))
    .refine(
      (files) => files.every((file) => sizeInMb(file.size) <= MAX_SIZE),
      `The maximum file size is ${MAX_SIZE}MB`,
    )
    .refine(
      (files) => files.every((file) => ACCEPTED.includes(file.type)),
      "File type is not supported",
    )
    .refine((files) => files.length !== 0, "File is required"),
});

export const createAttachments = async (
  ticketId: string,
  _actionState: ActionState,
  formData: FormData,
) => {
  const { user } = await getAuthOrRedirect();

  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
  });

  if (!ticket) {
    return toActionState("ERROR", "Ticket not found");
  }

  if (!isOwner(user, ticket)) {
    return toActionState("ERROR", "Not the owner of this ticket");
  }

  const attachments = [];
  const uploadedKeys: string[] = [];

  try {
    const { files } = createAttachmentsSchema.parse({
      files: formData.getAll("files"),
    });

    for (const file of files) {
      const buffer = await Buffer.from(await file.arrayBuffer());

      const attachment = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          name: file.name,
        },
      });

      const key = generateS3Key({
        organizationId: ticket.organizationId,
        ticketId,
        filename: file.name,
        attachmentId: attachment.id,
      });

      attachments.push(attachment);
      uploadedKeys.push(key);

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        }),
      );
    }
  } catch (error) {
    // Rollback S3 uploads
    await Promise.all(
      uploadedKeys.map(
        (key) =>
          s3
            .send(
              new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
              }),
            )
            .catch(() => null), // Don’t crash during rollback
      ),
    );

    // Rollback DB entries
    await Promise.all(
      attachments.map((a) =>
        prisma.attachment.deleteMany({ where: { id: a.id } }),
      ),
    );

    return fromErrorToActionState(error);
  }

  revalidatePath(ticketPath(ticketId));

  return toActionState("SUCCESS", "Attachment(s) uploaded");
};
