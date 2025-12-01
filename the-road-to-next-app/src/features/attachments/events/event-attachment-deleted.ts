import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/aws";
import { inngest } from "@/lib/inngest";
import { generateS3Key } from "../utils/generate-s3-key";

export type AttachmentDeleteEventArgs = {
  data: {
    organizationId: string;
    ticketId: string;
    filename: string;
    attachmentId: string;
  };
};

export const attahcmentDeletedEvent = inngest.createFunction(
  { id: "attachment-deleted" },
  { event: "app/attachment.deleted" },
  async ({ event }) => {
    const { organizationId, ticketId, filename, attachmentId } = event.data;

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: generateS3Key({
            organizationId,
            ticketId,
            filename,
            attachmentId,
          }),
        }),
      );
    } catch (error) {
      console.error("Error deleting attachment from S3:", error);
      return { event, body: false };
    }

    return { event, body: true };
  },
);
