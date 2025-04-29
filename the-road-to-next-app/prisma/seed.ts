import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const tickets = [
  {
    title: "Ticket 1",
    content: "Content for ticket 1 from the db",
    status: "DONE" as const,
  },
  {
    title: "Ticket 2",
    content: "Content for ticket 2 from the db",
    status: "OPEN" as const,
  },
  {
    title: "Ticket 3",
    content: "Content for ticket 3 from the db",
    status: "IN_PROGRESS" as const,
  },
];

const seed = async () => {
  const t0 = performance.now();

  await prisma.ticket.deleteMany();
  await prisma.ticket.createMany({
    data: tickets,
  });

  const t1 = performance.now();
  console.log(`Seeded ${tickets.length} tickets in ${t1 - t0} ms`);
};

seed();
