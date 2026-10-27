import { expect, test } from "@playwright/test";

test("field reports contain only timings and route templates", async ({
  page,
  browserName,
}) => {
  const reports: {
    body: Record<string, unknown>;
    headers: Record<string, string>;
  }[] = [];
  await page.route("**/api/performance", async (route) => {
    reports.push({
      body: route.request().postDataJSON(),
      headers: await route.request().allHeaders(),
    });
    await route.fulfill({ status: 204 });
  });
  await page.context().addCookies([
    {
      name: "private-test-cookie",
      value: "never-send",
      url: "http://127.0.0.1:3017",
    },
  ]);
  await page.goto("/fi/browse?q=private-search#private-fragment");
  await page.getByRole("heading").first().waitFor();
  await page
    .getByRole("link", {
      name: /Free and Premium|Ilmainen ja Premium/,
      exact: true,
    })
    .first()
    .click();
  await expect(page).toHaveURL(/\/premium$/);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.goto("about:blank");
  await expect.poll(() => reports.length).toBeGreaterThan(0);
  if (browserName === "chromium")
    await expect
      .poll(() => [...new Set(reports.map(({ body }) => body.name))])
      .toEqual(expect.arrayContaining(["LCP", "INP", "CLS"]));
  for (const { body, headers } of reports) {
    expect(Object.keys(body).sort()).toEqual([
      "device",
      "name",
      "route",
      "source",
      "value",
    ]);
    expect(body.route).toBe("/browse");
    expect(JSON.stringify(body)).not.toMatch(/private|cookie|fragment/);
    expect(headers.cookie).toBeUndefined();
    expect(headers.referer).toBeUndefined();
  }
});

test("guest exchange documents never emit field reports", async ({ page }) => {
  const reports: string[] = [];
  await page.route("**/api/performance", async (route) => {
    reports.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });
  await page.goto("/fi/guest#private-token");
  await page.getByRole("heading").first().waitFor();
  await page.goto("about:blank");
  expect(reports).toEqual([]);
});

for (const preference of ["doNotTrack", "globalPrivacyControl"] as const)
  test(`${preference} suppresses field reports`, async ({ page }) => {
    await page.addInitScript(
      (name) =>
        Object.defineProperty(navigator, name, {
          value: name === "doNotTrack" ? "1" : true,
        }),
      preference,
    );
    const reports: string[] = [];
    await page.route("**/api/performance", async (route) => {
      reports.push(route.request().postData() ?? "");
      await route.fulfill({ status: 204 });
    });
    await page.goto("/en");
    await page.getByRole("heading").first().waitFor();
    await page
      .getByRole("link", {
        name: /Free and Premium|Ilmainen ja Premium/,
        exact: true,
      })
      .first()
      .click();
    expect(reports).toEqual([]);
  });
