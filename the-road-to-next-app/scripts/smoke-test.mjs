import assert from "node:assert/strict";

const origin = process.env.APP_URL ?? "http://localhost:3000";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
  "Smoke tests must target a local development database/app.",
);
const cookies = new Map();
const decode = (value) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
const request = async (path, options = {}) => {
  console.log(`${options.method ?? "GET"} ${path}`);
  const response = await fetch(new URL(path, origin), {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: {
      Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      Origin: origin,
      Accept: "text/html",
      ...options.headers,
    },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
};
const page = async (path) => {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} should render`);
  const html = await response.text();
  assert(
    !html.includes("digest") &&
      !html.includes("data-dgst") &&
      !html.includes("<!--$!-->"),
    `${path} must not contain a streamed server error`,
  );
  assert(
    !html.includes("passwordHash"),
    `${path} must not expose password hashes`,
  );
  return html;
};
const submit = async (path, fields) => {
  const html = await page(path);
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
    .map((match) => match[1])
    .find((value) =>
      Object.keys(fields).every((key) => value.includes(`name="${key}"`)),
    );
  assert(form, `Form on ${path} must exist`);
  const data = new FormData();
  for (const match of form.matchAll(/<input\b([^>]+)>/g)) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(([, key, value]) => [
        key,
        decode(value),
      ]),
    );
    if (attributes.type === "hidden" && attributes.name)
      data.append(attributes.name, attributes.value ?? "");
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  const response = await request(path, { method: "POST", body: data });
  assert(
    [200, 303].includes(response.status),
    `Form on ${path} returned ${response.status}`,
  );
  const body = await response.text();
  assert(
    !body.includes("digest") &&
      !body.includes("data-dgst") &&
      !body.includes("<!--$!-->"),
    `Form on ${path} must not contain a streamed error`,
  );
  return response;
};

await page("/");
await page("/sign-in");
await page("/sign-up");
await page("/password-forgot");
assert.equal((await request("/tickets")).status, 307);
assert.equal((await request("/api/tickets/not-a-ticket")).status, 404);
const invalidQuery = await request(
  "/api/tickets?sortKey=invalid&sortValue=invalid&size=-1&page=-5",
);
assert.equal(invalidQuery.status, 200);
assert((await invalidQuery.json()).list.length <= 1);
const login = await submit("/sign-in", {
  email: "admin@example.com",
  password: "secret",
});
assert.equal(login.status, 303, "Seeded admin should sign in");
assert(cookies.has("session"), "Sign-in should set a session cookie");
await page("/tickets");
await page("/tickets/organization");
await page("/organization");
await page("/account/profile");
await page("/account/password");
const title = `Smoke test ${Date.now()}`;
await submit("/tickets", {
  title,
  content: "HTTP smoke test ticket",
  deadline: "2027-01-15",
  bounty: "19.99",
});
const created = await (
  await request(`/api/tickets?search=${encodeURIComponent(title)}`)
).json();
assert.equal(created.list.length, 1, "Ticket creation should persist");
const ticket = created.list[0];
assert.equal(ticket.bounty, 1999);
await page(`/tickets/${ticket.id}`);
await submit(`/tickets/${ticket.id}/edit`, {
  title: `${title} edited`,
  content: "Updated from smoke test",
  deadline: "2027-02-15",
  bounty: "4.99",
});
const updated = await (await request(`/api/tickets/${ticket.id}`)).json();
assert.equal(updated.title, `${title} edited`);
assert.equal(updated.bounty, 499);
await submit(`/tickets/${ticket.id}`, { content: "Smoke test comment" });
assert((await page(`/tickets/${ticket.id}`)).includes("Smoke test comment"));
await submit("/organization/create", { name: title });
assert((await page("/organization")).includes(title));
const jobs = await (await request("/api/inngest")).json();
assert.equal(jobs.function_count, 4);
console.log(
  "HTTP smoke tests passed: public pages, protected routes, sign-in, ticket create/edit, comment creation, organization creation, Inngest registration.",
);
console.log(
  "Smoke test records remain in the development database; re-seed it when finished.",
);
