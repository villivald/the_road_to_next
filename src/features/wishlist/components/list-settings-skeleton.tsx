import { ArrowLeft, UsersRound } from "lucide-react";
import managementStyles from "@/components/list-management.module.css";
import loading from "@/components/loading/loading-preview.module.css";
import shell from "@/components/shell.module.css";
import { useText } from "@/i18n/use-text";

export function ListSettingsSkeleton() {
  const t = useText();

  return (
    <section className={managementStyles.page} data-loading-preview>
      <p role="status" className={shell["visually-hidden"]}>
        {t("Loading")} {t("List settings").toLowerCase()}…
      </p>
      <div
        className={managementStyles.page}
        aria-hidden="true"
        aria-busy="true"
      >
        <div className={managementStyles.header}>
          <div className={managementStyles.navigation}>
            <span className={managementStyles["back-preview"]}>
              <ArrowLeft size={18} /> {t("Back to list")}
            </span>
            <span className={managementStyles["back-preview"]}>
              <UsersRound size={18} /> {t("List access")}
            </span>
          </div>
          <h1>{t("List settings")}</h1>
          <div className={`${loading.block} ${loading.line}`} />
        </div>
        <div className={shell["content-columns"]}>
          <div className={managementStyles.panel}>
            <h2>{t("Details and reservations")}</h2>
            <div className={`${loading.block} ${loading.label}`} />
            <div className={`${loading.block} ${loading.input}`} />
            <div className={`${loading.block} ${loading.line}`} />
            <div className={`${loading.block} ${loading.label}`} />
            <div className={`${loading.block} ${loading.textarea}`} />
            <div className={`${loading.block} ${loading.line}`} />
            <div className={`${loading.block} ${loading.toolbar}`} />
            <div className={`${loading.block} ${loading.button}`} />
          </div>
          <div className={managementStyles.panel}>
            <div className={`${loading.block} ${loading.title}`} />
            <div className={`${loading.block} ${loading.media}`} />
            <div className={`${loading.block} ${loading.input}`} />
          </div>
        </div>
        <div className={managementStyles.panel}>
          <h2>{t("Delete list")}</h2>
          <div className={`${loading.block} ${loading.line}`} />
          <div className={`${loading.block} ${loading.button}`} />
        </div>
      </div>
    </section>
  );
}
