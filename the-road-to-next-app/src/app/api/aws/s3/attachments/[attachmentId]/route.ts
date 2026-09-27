import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";
import { generateS3Key } from "@/features/attachments/utils/generate-s3-key";
import { getOrganizationIdByAttachment } from "@/features/attachments/utils/helper";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { s3 } from "@/lib/aws";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  await getAuthOrRedirect();

  const { attachmentId } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: {
      id: attachmentId,
    },
    include: {
      ticket: true,
      comment: {
        include: { ticket: true },
      },
    },
  });

  if (!attachment)
    return Response.json({ error: "Attachment not found" }, { status: 404 });

  const subject = attachment.comment ?? attachment.ticket;

  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  const organizationId = getOrganizationIdByAttachment(
    attachment.entity,
    subject,
  );

  const presignedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: generateS3Key({
        organizationId,
        entityId: subject.id,
        entity: attachment.entity,
        filename: attachment.name,
        attachmentId: attachment.id,
      }),
    }),
    { expiresIn: 5 * 60 },
  );

  const response = await fetch(presignedUrl);

  if (!response.ok)
    return Response.json({ error: "File unavailable" }, { status: 502 });

  const headers = new Headers({
    "Content-Type":
      response.headers.get("content-type") ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  headers.append(
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
  );

  return new Response(response.body, {
    headers,
  });
}
