export const getBaseUrl = () => {
  const configured = process.env.APP_URL;
  if (configured) return new URL(configured).origin;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
};
