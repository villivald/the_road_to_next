import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const users = [
  {
    username: "admin",
    email: "admin@admin.com",
  },
  {
    username: "user",
    email: "maxim@villivald.com",
  },
];

const tickets = [
  {
    title: "Ticket 1",
    content: "Content for ticket 1 from the db",
    status: "DONE" as const,
    bounty: 499, // $4.99
    deadline: new Date().toISOString().split("T")[0], // YYYY-MM-DD
  },
  {
    title: "Ticket 2",
    content: "Content for ticket 2 from the db",
    status: "OPEN" as const,
    bounty: 1999,
    deadline: new Date().toISOString().split("T")[0],
  },
  {
    title: "Ticket 3",
    content: "Content for ticket 3 from the db",
    status: "IN_PROGRESS" as const,
    bounty: 999,
    deadline: new Date().toISOString().split("T")[0],
  },
];

const seed = async () => {
  const t0 = performance.now();

  await prisma.user.deleteMany();
  await prisma.ticket.deleteMany();

  const passwordHash = await hash("secret");

  const dbUsers = await prisma.user.createManyAndReturn({
    data: users.map((user) => ({
      ...user,
      passwordHash,
    })),
  });

  await prisma.ticket.createMany({
    data: tickets.map((ticket) => ({
      ...ticket,
      userId: dbUsers[0].id, // admin
    })),
  });

  const t1 = performance.now();
  console.log(`Seeded ${tickets.length} tickets in ${t1 - t0} ms`);
};

seed();
