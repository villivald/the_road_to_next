import { AttachmentEntity } from "@/generated/prisma";

type GenerateKeyArgs = {
  organizationId: string;
  entityId: string;
  entity: AttachmentEntity;
  filename: string;
  attachmentId: string;
};

export const generateS3Key = ({
  organizationId,
  entityId,
  entity,
  filename,
  attachmentId,
}: GenerateKeyArgs) => {
  return `${organizationId}/${entity}/${entityId}/${filename}-${attachmentId}`;
};
