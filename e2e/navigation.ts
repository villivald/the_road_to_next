import { expect, type Page } from "@playwright/test";

export const openMainNavigation = async (page: Page, locale = "en") => {
  const toggle = page.getByRole("button", {
    name: locale === "fi" ? "Valikko" : "Menu",
    exact: true,
  });
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  return page.getByRole("navigation", {
    name: locale === "fi" ? "Päänavigaatio" : "Main navigation",
    includeHidden: true,
  });
};
