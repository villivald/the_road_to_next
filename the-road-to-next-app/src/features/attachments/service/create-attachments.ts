import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { AttachmentEntity } from "@/generated/prisma";
import { s3 } from "@/lib/aws";
import { prisma } from "@/lib/prisma";
import { AttachmentSubject, isComment, isTicket } from "../types";
import { generateS3Key } from "../utils/generate-s3-key";
import { getOrganizationIdByAttachment } from "../utils/helper";

type CreateAttachmentArgs = {
  files: File[];
  entityId: string;
  entity: AttachmentEntity;
  subject: AttachmentSubject;
};

export const createAttachments = async ({
  files,
  entityId,
  entity,
  subject,
}: CreateAttachmentArgs) => {
  const attachments = [];
  const uploadedKeys: string[] = [];

  try {
    for (const file of files) {
      const buffer = await Buffer.from(await file.arrayBuffer());

      const attachment = await prisma.attachment.create({
        data: {
          name: file.name,
          ...(entity === "TICKET" ? { ticketId: entityId } : {}),
          ...(entity === "COMMENT" ? { commentId: entityId } : {}),
          entity,
        },
      });

      let organizationId = getOrganizationIdByAttachment(entity, subject);

      switch (entity) {
        case "TICKET":
          if (isTicket(subject)) {
            organizationId = subject.organizationId;
          }
          break;
        case "COMMENT":
          if (isComment(subject)) {
            organizationId = subject.ticket.organizationId;
          }
          break;
      }

      const key = generateS3Key({
        organizationId,
        entityId,
        entity,
        filename: file.name,
        attachmentId: attachment.id,
      });

      attachments.push(attachment.id);
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
      attachments.map((id) => prisma.attachment.deleteMany({ where: { id } })),
    );

    throw error;
  }

  return attachments;
};
