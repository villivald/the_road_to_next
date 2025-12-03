import { AttachmentEntity } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const getAttachments = async (
  entityId: string,
  entity: AttachmentEntity,
) => {
  switch (entity) {
    case "TICKET":
      return prisma.attachment.findMany({
        where: { ticketId: entityId },
      });
    case "COMMENT":
      return prisma.attachment.findMany({
        where: { commentId: entityId },
      });
    default:
      return [];
  }
};
