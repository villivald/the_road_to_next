import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import styles from "@/components/shell.module.css";
import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ImageEditor } from "@/features/media/components/image-editor";
import { SharingCardDownload } from "@/features/premium/components/sharing-card-download";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { ListForm } from "@/features/wishlist/components/list-form";
import { ListSettings } from "@/features/wishlist/components/list-settings";
import settingsStyles from "@/features/wishlist/components/list-settings.module.css";
import { readManagedWishlist } from "@/features/wishlist/service/lists";
import { getText } from "@/i18n/server";
import { listPath } from "@/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: t("List settings"),
    robots: { index: false, follow: false },
  };
}

export default async function ListSettingsPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const t = await getText();

  const { user } = await getAuthOrRedirect();
  const { listId } = await params;
  const list = await readManagedWishlist(listId, user.id);

  if (!list) {
    notFound();
  }

  const access = await readPremiumAccess(list.ownerId!);

  return (
    <div className={settingsStyles.page}>
      <header className={settingsStyles.header}>
        <BackLink href={listPath(listId)}>{t("Back to list")}</BackLink>
        <h1>{t("List settings")}</h1>
        <p className={styles.description}>{list.title}</p>
      </header>
      <div className={styles["content-columns"]}>
        <section
          className={settingsStyles.settings}
          aria-labelledby="list-details-heading"
        >
          <h2 id="list-details-heading">{t("Details and reservations")}</h2>
          <ListForm list={list} canCustomizeTheme={access.plan === "PREMIUM"} />
        </section>
        <div
          className={`${settingsStyles.settings} ${settingsStyles["image-panel"]}`}
        >
          <ImageEditor target={{ kind: "list", listId }} image={list.image} />
        </div>
      </div>
      <section id="sharing-card" className={settingsStyles.settings}>
        <SharingCardDownload
          listId={list.id}
          title={list.title}
          theme={list.theme}
          premium={access.plan === "PREMIUM"}
          published={list.publication === "PUBLISHED"}
          privateList={list.visibility === "PRIVATE"}
        />
      </section>
      <ListSettings list={list} premium={access.plan === "PREMIUM"} />
    </div>
  );
}
