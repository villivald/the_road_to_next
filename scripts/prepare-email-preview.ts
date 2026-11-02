import { copyFile, mkdir } from "node:fs/promises";

// Keep the preview independent of the app server without duplicating the logo
// in version control. Production emails still use APP_URL/email-brand.png.
const directory = new URL("../src/emails/static/", import.meta.url);
await mkdir(directory, { recursive: true });
await copyFile(
  new URL("../public/email-brand.png", import.meta.url),
  new URL("email-brand.png", directory),
);
