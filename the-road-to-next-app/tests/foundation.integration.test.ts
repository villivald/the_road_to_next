import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  authenticate,
  changePassword,
  register,
  resetPassword,
  verifyEmail,
} from "@/features/auth/service/accounts";
import { consumeRateLimit } from "@/features/auth/service/security";
import { generateEmailVerificationCode } from "@/features/auth/utils/generate-email-verification-code";
import { generatePasswordResetLink } from "@/features/password/utils/generate-password-reset-link";
import { verifyPasswordHash } from "@/features/password/utils/hash-and-verify";
import { validateSession } from "@/lib/lucia";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";
import { assertTestDatabase } from "../e2e/environment";
import { accounts, newAccount, resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);

beforeEach(resetFixtures);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("wishlist database invariants", () => {
  it("cannot move an owner's membership to another list", async () => {
    await prisma.wishlist.create({
      data: {
        id: "e2e-destination",
        title: "Destination",
        ownerId: "e2e-owner",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
      },
    });
    await expect(
      prisma.membership.updateMany({
        where: { wishlistId: "e2e-private-list", userId: "e2e-member" },
        data: { wishlistId: "e2e-destination" },
      }),
    ).rejects.toThrow();
    expect(
      await prisma.membership.count({
        where: {
          wishlistId: "e2e-private-list",
          userId: "e2e-member",
          role: "ADMIN",
        },
      }),
    ).toBe(1);
  });
  it("defaults to a public draft with independent wish states", async () => {
    const list = await prisma.wishlist.create({
      data: {
        id: "e2e-defaults",
        title: "A list",
        ownerId: "e2e-owner",
        memberships: { create: { userId: "e2e-owner", role: "ADMIN" } },
        wishes: { create: { title: "A wish", authorId: "e2e-member" } },
      },
      include: { wishes: true },
    });
    expect(list).toMatchObject({
      publication: "DRAFT",
      visibility: "PUBLIC",
      reservationsEnabled: false,
      archivedAt: null,
    });
    expect(list.wishes[0]).toMatchObject({
      hidden: false,
      fulfilledAt: null,
      priceMinor: null,
      currency: null,
      priority: null,
    });
  });
  it("requires an owner/admin and prevents demoting or removing that membership", async () => {
    await expect(
      prisma.wishlist.create({
        data: { id: "e2e-invalid", title: "Invalid", ownerId: "e2e-owner" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.membership.updateMany({
        where: { wishlistId: "e2e-private-list", userId: "e2e-member" },
        data: { role: "MEMBER" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.user.delete({ where: { id: "e2e-member" } }),
    ).rejects.toThrow();
    expect(
      await prisma.wishlist.count({ where: { id: "e2e-private-list" } }),
    ).toBe(1);
  });
  it("retains archived lists and wishes when a former owner/author is deleted", async () => {
    await prisma.wishlist.update({
      where: { id: "e2e-private-list" },
      data: { archivedAt: new Date(), ownerId: null },
    });
    await prisma.user.delete({ where: { id: "e2e-member" } });
    expect(
      await prisma.wishlist.findUnique({ where: { id: "e2e-private-list" } }),
    ).toMatchObject({ ownerId: null });
    expect(
      await prisma.wish.findUnique({ where: { id: "e2e-wish" } }),
    ).toMatchObject({ authorId: null });
  });
  it("rejects invalid money/priority and distinguishes zero from missing price", async () => {
    for (const data of [
      { priceMinor: -1, currency: "EUR" as const },
      { priceMinor: 100 },
      { priority: 6 },
      { priority: 0 },
    ]) {
      await expect(
        prisma.wish.update({ where: { id: "e2e-wish" }, data }),
      ).rejects.toThrow();
    }
    const wish = await prisma.wish.update({
      where: { id: "e2e-wish" },
      data: { priceMinor: 0, currency: "EUR", priority: 5 },
    });
    expect(wish.priceMinor).toBe(0);
  });
  it("allows exactly one concurrent active reservation and permits reserving again after it ends", async () => {
    const attempts = await Promise.allSettled(
      ["e2e-owner", "e2e-member"].map((userId) =>
        prisma.reservation.create({ data: { userId, wishId: "e2e-wish" } }),
      ),
    );
    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    await prisma.reservation.updateMany({
      where: { wishId: "e2e-wish" },
      data: { endedAt: new Date(Date.now() + 1000) },
    });
    await prisma.reservation.create({
      data: { userId: "e2e-owner", wishId: "e2e-wish" },
    });
    expect(
      await prisma.reservation.count({
        where: { wishId: "e2e-wish", endedAt: null },
      }),
    ).toBe(1);
  });
});

describe("account security with PostgreSQL", () => {
  it("registers without organizations; verification is hashed, single-use, and rotates sessions", async () => {
    const account = await register(newAccount);
    const code = await generateEmailVerificationCode(
      account.user.id,
      account.user.email,
    );
    const stored = await prisma.emailVerificationToken.findUniqueOrThrow({
      where: { userId: account.user.id },
    });
    expect(stored.codeHash).toBe(hashToken(code));
    expect(JSON.stringify(stored)).not.toContain(code);
    const verified = await verifyEmail(
      account.user.id,
      account.user.email,
      code,
    );
    expect((await validateSession(account.token)).user).toBeNull();
    expect((await validateSession(verified.token)).user?.emailVerified).toBe(
      true,
    );
    await expect(
      verifyEmail(account.user.id, account.user.email, code),
    ).rejects.toThrow("Invalid or expired");
  });
  it("expires codes without verifying accounts", async () => {
    const account = await register(newAccount);
    const code = await generateEmailVerificationCode(
      account.user.id,
      account.user.email,
    );
    await prisma.emailVerificationToken.update({
      where: { userId: account.user.id },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      verifyEmail(account.user.id, account.user.email, code),
    ).rejects.toThrow("Invalid or expired");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } }))
        .emailVerified,
    ).toBe(false);
  });
  it("consumes reset tokens once under concurrency and revokes all sessions", async () => {
    const login = await authenticate(
      accounts.owner.email,
      accounts.owner.password,
    );
    const link = await generatePasswordResetLink(login.user.id);
    const token = link.split("/").at(-1)!;
    const attempts = await Promise.allSettled([
      resetPassword(token, "Changed-password-one!"),
      resetPassword(token, "Changed-password-two!"),
    ]);
    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect((await validateSession(login.token)).user).toBeNull();
    await expect(
      resetPassword(token, "Changed-password-three!"),
    ).rejects.toThrow("Token is invalid or expired");
  });
  it("rejects expired reset tokens without changing passwords or sessions", async () => {
    const login = await authenticate(
      accounts.owner.email,
      accounts.owner.password,
    );
    const token = (await generatePasswordResetLink(login.user.id))
      .split("/")
      .at(-1)!;
    await prisma.passwordResetToken.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(0) },
    });
    await expect(resetPassword(token, "Changed-password-one!")).rejects.toThrow(
      "Token is invalid or expired",
    );
    expect((await validateSession(login.token)).user?.id).toBe(login.user.id);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: login.user.id },
    });
    expect(
      await verifyPasswordHash(user.passwordHash, accounts.owner.password),
    ).toBe(true);
  });
  it("password change preserves only the rotated session and invalidates recovery tokens", async () => {
    const login = await authenticate(
      accounts.owner.email,
      accounts.owner.password,
    );
    await generatePasswordResetLink(login.user.id);
    await expect(
      changePassword(login.user.id, "wrong", "New-password-value!"),
    ).rejects.toThrow("Incorrect current password");
    const changed = await changePassword(
      login.user.id,
      accounts.owner.password,
      "New-password-value!",
    );
    expect((await validateSession(login.token)).user).toBeNull();
    expect((await validateSession(changed.token)).user?.id).toBe(login.user.id);
    expect(
      await prisma.passwordResetToken.count({
        where: { userId: login.user.id },
      }),
    ).toBe(0);
  });
  it("enforces shared rate limits under concurrent requests", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        consumeRateLimit("integration", "e2e-owner", 3, 60_000),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(3);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason.message).toContain("Too many attempts");
      }
    }
  });
});
