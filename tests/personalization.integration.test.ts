import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/lists/[listId]/sharing-card/route";
import { readProfile, updateProfile } from "@/features/account/service/account";
import { authenticate } from "@/features/auth/service/accounts";
import {
  discoverLists,
  discoverUsers,
} from "@/features/discovery/service/discovery";
import { readGuestList } from "@/features/guest/service/access";
import { readSharingCard } from "@/features/premium/service/sharing-card";
import {
  createWishlist,
  readWishlist,
  updateWishlist,
} from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";
import { assertTestDatabase } from "../e2e/environment";
import { accounts, resetFixtures } from "../e2e/seed";

const auth = vi.hoisted(() => ({
  current: { user: null, session: null } as {
    user: null | { id: string; emailVerified: boolean };
    session: null | { id: string };
  },
}));
vi.mock("@/features/auth/actions/get-auth", () => ({
  getAuth: async () => auth.current,
}));
assertTestDatabase(process.env);
beforeEach(async () => {
  await resetFixtures();
  auth.current = { user: null, session: null };
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetFixtures();
  await prisma.$disconnect();
});
const login = () => authenticate(accounts.owner.email, accounts.owner.password);
const grant = (userId = "e2e-owner") =>
  prisma.premiumGrant.create({
    data: {
      userId,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
const input = {
  title: "A personal list",
  description: "",
  reservationsEnabled: true,
};
const publish = (id: string) =>
  prisma.wishlist.update({ where: { id }, data: { publication: "PUBLISHED" } });

it("keeps defaults free and rejects forged themes or unpaid premium themes", async () => {
  expect((await readProfile("e2e-owner")).showPremiumBadge).toBe(false);
  const list = await createWishlist("e2e-owner", input);
  expect((await readWishlist(list.id, "e2e-owner"))?.theme).toBe("classic");
  await expect(
    createWishlist("e2e-owner", { ...input, theme: "botanical" }),
  ).rejects.toThrow("Premium");
  await expect(
    createWishlist("e2e-owner", { ...input, theme: "arbitrary-css" }),
  ).rejects.toThrow();
});
it("keeps chosen themes after expiry, allows content edits/reset, and uses the owner's access for admins", async () => {
  const premium = await grant();
  const list = await createWishlist("e2e-owner", {
    ...input,
    theme: "botanical",
  });
  await prisma.membership.create({
    data: { wishlistId: list.id, userId: "e2e-member", role: "ADMIN" },
  });
  await updateWishlist("e2e-member", list.id, { ...input, theme: "wedding" });
  await prisma.premiumGrant.update({
    where: { id: premium.id },
    data: { revokedAt: new Date() },
  });
  await grant("e2e-member");
  await updateWishlist("e2e-owner", list.id, {
    ...input,
    title: "Edited without changing theme",
  });
  expect((await readWishlist(list.id, "e2e-owner"))?.theme).toBe("wedding");
  await updateWishlist("e2e-owner", list.id, { ...input, theme: "wedding" });
  await expect(
    updateWishlist("e2e-member", list.id, { ...input, theme: "festive" }),
  ).rejects.toThrow("Premium");
  await updateWishlist("e2e-owner", list.id, { ...input, theme: "classic" });
  expect((await readWishlist(list.id, "e2e-owner"))?.theme).toBe("classic");
});
it("does not expose themes through unauthorized or expired guest access", async () => {
  await grant();
  const list = await createWishlist("e2e-owner", {
    ...input,
    visibility: "PRIVATE",
    theme: "birthday",
  });
  await publish(list.id);
  expect(await readWishlist(list.id, "e2e-member")).toBeNull();
  const token = "a".repeat(32);
  const link = await prisma.guestLink.create({
    data: {
      wishlistId: list.id,
      label: "test",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  expect((await readGuestList(list.id, token))?.theme).toBe("birthday");
  await prisma.guestLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });
  expect(await readGuestList(list.id, token)).toBeNull();
});
it("only shows opted-in active badges and permits hiding after expiry", async () => {
  const { user, session } = await login();
  const list = await createWishlist(user.id, input);
  await publish(list.id);
  const profile = { name: "Owner", description: "", showPremiumBadge: true };
  await expect(updateProfile(user.id, session.id, profile)).rejects.toThrow(
    "Premium",
  );
  const premium = await grant();
  await updateProfile(user.id, session.id, profile);
  expect(
    (await discoverUsers({ view: "users" })).users.find(
      (u) => u.username === "e2e-owner",
    )?.showPremiumBadge,
  ).toBe(true);
  await prisma.premiumGrant.update({
    where: { id: premium.id },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  expect(
    (await discoverUsers({ view: "users" })).users.find(
      (u) => u.username === "e2e-owner",
    )?.showPremiumBadge,
  ).toBe(false);
  await updateProfile(user.id, session.id, {
    ...profile,
    showPremiumBadge: false,
  });
  expect((await readProfile(user.id)).showPremiumBadge).toBe(false);
});
it("requires a live admin session, publication and owner Premium for card downloads", async () => {
  const { user, session } = await login();
  await grant();
  const list = await createWishlist(user.id, {
    ...input,
    visibility: "PRIVATE",
  });
  expect(await readSharingCard(user.id, session.id, list.id)).toBeNull();
  await publish(list.id);
  expect(await readSharingCard(user.id, session.id, list.id)).toMatchObject({
    id: list.id,
  });
  expect(await readSharingCard("e2e-member", session.id, list.id)).toBeNull();
  await prisma.session.delete({ where: { id: session.id } });
  expect(await readSharingCard(user.id, session.id, list.id)).toBeNull();
});
it("returns private no-store PNG downloads and rejects an expired entitlement", async () => {
  const { user, session } = await login();
  const premium = await grant();
  const list = await createWishlist(user.id, { ...input, theme: "playful" });
  await publish(list.id);
  const request = new Request(
    `http://localhost/api/lists/${list.id}/sharing-card?locale=fi`,
  );
  const params = { params: Promise.resolve({ listId: list.id }) };
  expect((await GET(request, params)).status).toBe(404);
  auth.current = { user, session };
  const response = await GET(request, params);
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Content-Disposition")).toContain("attachment");
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  await prisma.premiumGrant.update({
    where: { id: premium.id },
    data: { revokedAt: new Date() },
  });
  expect((await GET(request, params)).status).toBe(404);
});
it.each(["membership", "session", "premium", "publication"])(
  "rechecks %s after rendering, so revoked access receives no bytes",
  async (revocation) => {
    const premium = await grant();
    const list = await createWishlist("e2e-owner", input);
    await publish(list.id);
    await prisma.membership.create({
      data: { wishlistId: list.id, userId: "e2e-member", role: "ADMIN" },
    });
    const { user, session } = await authenticate(
      accounts.member.email,
      accounts.member.password,
    );
    auth.current = { user, session };
    const renderer =
      await import("@/features/premium/service/render-sharing-card");
    vi.spyOn(renderer, "renderSharingCard").mockImplementation(async () => {
      if (revocation === "membership")
        await prisma.membership.deleteMany({
          where: { wishlistId: list.id, userId: user.id },
        });
      if (revocation === "session")
        await prisma.session.delete({ where: { id: session.id } });
      if (revocation === "premium")
        await prisma.premiumGrant.update({
          where: { id: premium.id },
          data: { revokedAt: new Date() },
        });
      if (revocation === "publication")
        await prisma.wishlist.update({
          where: { id: list.id },
          data: { publication: "DRAFT" },
        });
      return Buffer.from("never-return-this");
    });
    const response = await GET(new Request("http://localhost/?locale=en"), {
      params: Promise.resolve({ listId: list.id }),
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  },
);
it("returns themes through the existing discovery selection", async () => {
  await grant();
  const list = await createWishlist("e2e-owner", {
    ...input,
    theme: "minimal",
  });
  await publish(list.id);
  expect(
    (await discoverLists({ view: "lists" })).lists.find((l) => l.id === list.id)
      ?.theme,
  ).toBe("minimal");
});
