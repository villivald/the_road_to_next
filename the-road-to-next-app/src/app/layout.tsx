import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/header";
import { RedirectToast } from "@/components/redirect-toast";
import { Sidebar } from "@/components/sidebar/components/sidebar";
import ThemeProvider from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Road to Next.js",
  description: "My Road to Next.js application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Header />
          <div className="flex h-screen border-collapse overflow-hidden">
            <Sidebar />
            <main className="flex min-h-screen flex-1 flex-col overflow-x-hidden overflow-y-auto bg-secondary/20 px-8 py-24">
              {children}
            </main>
          </div>
          <Toaster expand />
          <RedirectToast />
        </ThemeProvider>
      </body>
    </html>
  );
}
