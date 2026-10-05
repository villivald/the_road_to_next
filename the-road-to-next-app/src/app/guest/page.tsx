import type { Metadata } from "next";
import { OpenGuestLink } from "@/features/guest/components/open-guest-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Guest link",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GuestEntryPage() {
  return <OpenGuestLink />;
}
