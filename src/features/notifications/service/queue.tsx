import { render } from "react-email";
import PremiumEmail, { type PremiumEmailProps } from "@/emails/account/premium";
import WelcomeEmail from "@/emails/account/welcome";
import type { Prisma } from "@/generated/prisma/client";
import { createText } from "@/i18n/text";
import { emailSender } from "@/lib/mail";

type Recipient = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  locale: string;
};

export const queueAccountEmail = async (
  tx: Prisma.TransactionClient,
  user: Recipient,
  message: {
    key: string;
    premium?: Omit<PremiumEmailProps, "toName" | "locale"> & {
      grantId: string;
    };
  },
) => {
  if (
    await tx.accountEmail.findUnique({
      where: { key: message.key },
      select: { id: true },
    })
  )
    return;
  const props = { toName: user.name ?? user.username, locale: user.locale };
  const t = createText(user.locale);
  const email = message.premium ? (
    <PremiumEmail {...props} {...message.premium} />
  ) : (
    <WelcomeEmail {...props} />
  );
  // Snapshot the complete provider request so retries remain identical across
  // profile changes, deployments, and provider idempotency checks.
  await tx.accountEmail.create({
    data: {
      key: message.key,
      userId: user.id,
      recipient: user.email,
      sender: emailSender(),
      grantId: message.premium?.grantId,
      subject: t(
        message.premium
          ? message.premium.source === "promo"
            ? "Your Premium access has been updated"
            : "Welcome to Premium"
          : "Welcome to Wishlist",
      ),
      html: await render(email),
      text: await render(email, { plainText: true }),
    },
  });
};
