import Script from "next/script";

export default function GoogleTagManager() {
  // Keep local development and Vercel preview traffic out of Ads measurements.
  if (process.env.VERCEL_ENV !== "production") return null;

  return (
    <>
      <Script id="google-tag-manager-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = function gtag() { window.dataLayer.push(arguments); };
          window.gtag('js', new Date());
        `}
      </Script>
      <Script
        id="google-tag-manager"
        src="https://www.googletagmanager.com/gtm.js?id=GTM-MWND8GRB"
        strategy="afterInteractive"
      />
    </>
  );
}
