import { writeFile } from "node:fs/promises";
import { renderSharingCard } from "../src/features/premium/service/render-sharing-card";

// Public examples contain no user content. Their QR codes open the Premium page.
process.env.APP_URL = "https://wishlist.fi";

for (const locale of ["en", "fi"]) {
  for (const [theme, title] of [
    ["festive", locale === "fi" ? "Joulutoiveet" : "Christmas wishes"],
    ["botanical", locale === "fi" ? "Toiveita kotiin" : "For my home"],
  ]) {
    const image = await renderSharingCard(
      { id: "example", title, theme, visibility: "PUBLIC" },
      locale,
      true,
    );
    await writeFile(
      `src/assets/illustrations/sharing-card-${theme}-${locale}.png`,
      image,
    );
  }
}
