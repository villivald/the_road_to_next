import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { manageableLists, readableLists } from "./access";
import { publicationSchema, wishlistIdSchema, wishlistSchema } from "./schemas";

export class WishlistError extends Error {}

const listFields = {
  id: true,
  title: true,
  description: true,
  publication: true,
  visibility: true,
  reservationsEnabled: true,
} satisfies Prisma.WishlistSelect;

export const readWishlist = async (id: string, userId: string | null) => {
  if (!wishlistIdSchema.safeParse(id).success) {
    return null;
  }

  const list = await prisma.wishlist.findFirst({
    where: { id, ...readableLists(userId) },
    select: {
      ...listFields,
      memberships: {
        where: {
          userId: userId ?? "",
          role: "ADMIN",
          user: { emailVerified: true },
        },
        select: { role: true },
      },
    },
  });

  if (!list) {
    return null;
  }

  const { memberships, ...details } = list;

  return { ...details, canManage: memberships.length > 0 };
};

export const readManagedWishlist = (id: string, userId: string) => {
  if (!wishlistIdSchema.safeParse(id).success) {
    return Promise.resolve(null);
  }

  return prisma.wishlist.findFirst({
    where: { id, ...manageableLists(userId) },
    select: listFields,
  });
};

export const readOwnedWishlists = async (userId: string, page = 1) => {
  const pageSize = 20;
  const currentPage =
    Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const results = await prisma.wishlist.findMany({
    where: { ownerId: userId, ...manageableLists(userId) },
    select: listFields,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize + 1,
  });

  return {
    lists: results.slice(0, pageSize),
    hasNextPage: results.length > pageSize,
    page: currentPage,
  };
};

export const createWishlist = async (userId: string, input: unknown) => {
  const data = wishlistSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: userId, emailVerified: true },
      select: { id: true },
    });

    if (!user) {
      throw new WishlistError(
        "Sign in with a verified account to create a list.",
      );
    }

    return tx.wishlist.create({
      data: {
        ...data,
        description: data.description || null,
        ownerId: user.id,
        publication: "DRAFT",
        visibility: "PUBLIC",
        memberships: { create: { userId: user.id, role: "ADMIN" } },
      },
      select: { id: true },
    });
  });
};

const lockManagedWishlist = async (
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
) => {
  wishlistIdSchema.parse(id);

  const schema =
    new URL(process.env.DATABASE_URL!).searchParams.get("schema") ?? "public";

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error("Invalid database schema");
  }

  // All list lifecycle writes share this lock; future wish/reservation writes must too.
  const table = Prisma.raw(`"${schema}"."Wishlist"`);
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM ${table} WHERE "id" = ${id} FOR UPDATE`,
  );

  const list = await tx.wishlist.findFirst({
    where: { id, ...manageableLists(userId) },
    select: { id: true },
  });

  if (!list) {
    throw new WishlistError(
      "This list is unavailable or you do not have permission to change it.",
    );
  }
};

export const updateWishlist = async (
  userId: string,
  id: string,
  input: unknown,
) => {
  const data = wishlistSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, id, userId);

    await tx.wishlist.update({
      where: { id },
      data: { ...data, description: data.description || null },
    });
  });
};

export const setWishlistPublication = async (
  userId: string,
  id: string,
  value: unknown,
) => {
  const publication = publicationSchema.parse(value);

  await prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, id, userId);

    if (publication === "DRAFT") {
      await tx.reservation.updateMany({
        where: { wish: { wishlistId: id }, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    await tx.wishlist.update({ where: { id }, data: { publication } });
  });
};

export const deleteWishlist = async (userId: string, id: string) => {
  await prisma.$transaction(async (tx) => {
    await lockManagedWishlist(tx, id, userId);

    // Wishes, memberships, and reservations cascade with their deleted list.
    await tx.wishlist.delete({ where: { id } });
  });
};
