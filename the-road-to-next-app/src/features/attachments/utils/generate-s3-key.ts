type GenerateKeyArgs = {
  organizationId: string;
  ticketId: string;
  filename: string;
  attachmentId: string;
};

export const generateS3Key = ({
  organizationId,
  ticketId,
  filename,
  attachmentId,
}: GenerateKeyArgs) => {
  return `${organizationId}/${ticketId}/${filename}-${attachmentId}`;
};
