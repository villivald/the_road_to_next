import "../globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Footer from "@/app/_navigation/footer";
import Header from "@/app/_navigation/header";
import styles from "@/components/shell.module.css";
import ThemeProvider from "@/components/theme/theme-provider";
import { isLocale } from "@/i18n/config";
import { getText } from "@/i18n/server";

const manrope = localFont({
  src: "../../assets/fonts/Manrope-Variable.ttf",
  variable: "--font-manrope",
  weight: "200 800",
  style: "normal",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText();
  return {
    title: { default: "Wishlist", template: "%s · Wishlist" },
    description: t("A place for the things you wish for."),
    referrer: "no-referrer",
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getText();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.variable} ${styles.body}`}>
        <NextIntlClientProvider locale={locale} messages={{}}>
          <ThemeProvider>
            <a href="#main-content" className={styles["skip-link"]}>
              {t("Skip to content")}
            </a>
            <Header />
            <main id="main-content" tabIndex={-1} className={styles.main}>
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
