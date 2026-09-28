import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertTestDatabase, testDatabaseUrl } from "./environment";

export const accounts = {
  owner: { email: "owner@example.test", password: "Fixture-only-password!" },
  member: { email: "member@example.test", password: "Fixture-only-password!" },
};

export const fixtureTicket = {
  id: "e2e-ticket",
  title: "Baseline ticket",
  content: "A repeatable ticket for browser checks.",
};

export const resetFixtures = async () => {
  assertTestDatabase(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });

  try {
    const passwordHash = await hash(accounts.owner.password);
    await prisma.$transaction(async (tx) => {
      await tx.organization.deleteMany({ where: { id: "e2e-organization" } });
      await tx.user.deleteMany({
        where: { id: { in: ["e2e-owner", "e2e-member"] } },
      });
      await tx.user.createMany({
        data: Object.entries(accounts).map(([role, account]) => ({
          id: `e2e-${role}`,
          username: `test-${role}`,
          email: account.email,
          emailVerified: true,
          passwordHash,
        })),
      });
      await tx.organization.create({
        data: {
          id: "e2e-organization",
          name: "Browser Test Organization",
          memberships: {
            create: [
              { userId: "e2e-owner", membershipRole: "ADMIN", isActive: true },
              {
                userId: "e2e-member",
                membershipRole: "MEMBER",
                isActive: true,
              },
            ],
          },
          tickets: {
            create: {
              ...fixtureTicket,
              userId: "e2e-owner",
              status: "OPEN",
              bounty: 1999,
              deadline: "2030-01-15",
            },
          },
        },
      });
    });
  } finally {
    await prisma.$disconnect();
  }
};
