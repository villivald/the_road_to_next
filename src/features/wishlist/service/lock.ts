import { Prisma } from "@/generated/prisma/client";
import { wishlistIdSchema } from "./schemas";

export const lockWishlist = async (
  tx: Prisma.TransactionClient,
  id: string,
) => {
  wishlistIdSchema.parse(id);

  const schema =
    new URL(process.env.DATABASE_URL!).searchParams.get("schema") ?? "public";

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error("Invalid database schema");
  }

  // Content, access, and reservation writes serialize on the same parent row.
  const table = Prisma.raw(`"${schema}"."Wishlist"`);
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM ${table} WHERE "id" = ${id} FOR UPDATE`,
  );
};
