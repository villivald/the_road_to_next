import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/app/_navigation/footer";
import Header from "@/app/_navigation/header";
import styles from "@/components/shell.module.css";
import ThemeProvider from "@/components/theme/theme-provider";

const manrope = localFont({
  src: "../assets/fonts/Manrope-Variable.ttf",
  variable: "--font-manrope",
  weight: "200 800",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Wishlist", template: "%s · Wishlist" },
  description: "A place for the things you wish for.",
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${styles.body}`}>
        <ThemeProvider>
          <a href="#main-content" className={styles["skip-link"]}>
            Skip to content
          </a>
          <Header />
          <main id="main-content" tabIndex={-1} className={styles.main}>
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
