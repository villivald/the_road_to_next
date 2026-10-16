import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { wishlistWordmarkPath } from "../src/assets/branding/wishlist-wordmark";

// Rasterize the existing outlined wordmark and Lucide Heart for email clients
// that cannot display SVG. No additional font download or license is needed.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 130"><rect width="720" height="130" fill="#faf8f0"/><g transform="translate(4 18) scale(4)" fill="#ffd803" stroke="#292731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></g><path transform="translate(137 14)" d="${wishlistWordmarkPath}" fill="#292731"/></svg>`;
await writeFile(
  new URL("../public/email-brand.png", import.meta.url),
  await sharp(Buffer.from(svg)).resize(400, 72).png().toBuffer(),
);
