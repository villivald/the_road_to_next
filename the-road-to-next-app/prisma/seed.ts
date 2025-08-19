import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const users = [
  {
    username: "admin",
    email: "admin@admin.com",
    emailVerified: true,
  },
  {
    username: "user",
    email: "maxim@villivald.com",
    emailVerified: true,
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

const comments = [
  {
    content: "This is a comment for ticket 1",
  },
  {
    content: "This is a comment for ticket 2",
  },
  {
    content: "This is a comment for ticket 3",
  },
];

const seed = async () => {
  const t0 = performance.now();

  await prisma.comment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.membership.deleteMany();

  const dbOrganization = await prisma.organization.create({
    data: {
      name: "Organization 1",
    },
  });

  const passwordHash = await hash("secret");

  const dbUsers = await prisma.user.createManyAndReturn({
    data: users.map((user) => ({
      ...user,
      passwordHash,
    })),
  });

  await prisma.membership.createMany({
    data: [
      {
        userId: dbUsers[0].id,
        organizationId: dbOrganization.id,
        isActive: true,
      },
    ],
  });

  const dbTickets = await prisma.ticket.createManyAndReturn({
    data: tickets.map((ticket) => ({
      ...ticket,
      userId: dbUsers[0].id, // admin
    })),
  });

  await prisma.comment.createMany({
    data: comments.map((comment) => ({
      ...comment,
      userId: dbUsers[1].id, // user
      ticketId: dbTickets[0].id, // first ticket
    })),
  });

  const t1 = performance.now();
  console.log(`Seeded ${tickets.length} tickets in ${t1 - t0} ms`);
};

seed();
