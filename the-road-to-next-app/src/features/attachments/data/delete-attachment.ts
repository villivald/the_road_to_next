import { prisma } from "@/lib/prisma";

type DeleteAttachmentArgs = {
  attachments: string[];
};

export const deleteAttachment = async ({
  attachments,
}: DeleteAttachmentArgs) => {
  return await Promise.all(
    attachments.map((id) => prisma.attachment.deleteMany({ where: { id } })),
  );
};
