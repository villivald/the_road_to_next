## Misc

- Plugin for sorting imports `eslint-plugin-simple-import-sort`
  - see usage example in [eslint config](./the-road-to-next-app/eslint.config.mjs)
- Absolute imports can be used in Next.js by adding a `@` prefix to the import path.
  - E.g. `import { data } from "@/data.ts"` instead of `import { data } from "../../../data.ts"` (assuming the file is in `/src` folder)
- Component composition pattern (passing children as props`<AppProvider>{children}</AppProvider>`) can be used to avoid propagating client components (`"use client"`) down the tree.

## Routing
- Dynamic route can be created by using square brackets in the file name. E.g. `app/tickets/[ticketId]/page.tsx`.

- Params of a route can be accessed using `useParams` hook. E.g. `const { ticketId } = useParams();` This approach however converts the route to a client component. Other way to access the params is via props:
```tsx
type TicketPageProps = {
  params: Promise<{ ticketId: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { ticketId } = await params;

  return <h1 className="text-lg">Ticket Page {ticketId}</h1>;
};

export default TicketPage;
```

- Path constants can be used to make the code more maintainable. See usage example in [paths.ts](./the-road-to-next-app/src/paths.ts).
```tsx
import { ticketPath } from "@/paths";
/* ... */
<Link href={ticketPath(ticket.id)}>View</Link>
/* ... */
```

## Typescript
- ts errors can be checked using `npm run type` command with `"type": "tsc --noEmit"` in package.json scripts.
- const assertions can be used for literal types, e.g. `let x = "hello" as const;`, type is `"hello"`, not `string`.

## Tailwind
Useful tailwind VSCode extensions:
- Tailwind CSS IntelliSense
- Tailwind Fold (`ctrl + opt + a`)
- Tailwind Docs (`cmd + shift + p`)

Conditional classes can be used with `clsx` package, e.g.
```tsx
import clsx from "clsx";
/* ... */
/* The default styles here are `text-sm text-slate-400 truncate`, line-through is added if the ticket status is DONE */
<p
  className={clsx("text-sm text-slate-400 truncate", {
    "line-through": ticket.status === "DONE",
  })}
>
  {ticket.content}
</p>
/* ... */
```

Custom animations in tailwind can be added to `globals.css` file:
```css
@theme inline {
  --animate-fade-from-top: fade-from-top 0.5s ease-out;

  @keyframes fade-from-top {
    0% {
      opacity: 0;
      transform: translateY(-16px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```
and then used in the component:
```tsx
<div className="flex-1 flex flex-col animate-fade-from-top">
...
</div>
```

## shadcn/ui

- `npx shadcn@latest init` - installs the shadcn/ui package and sets up the project with the necessary files and configurations.
- `npx shadcn@latest add button` - adds the button component to the project
- component files are created in `src/components/ui` folder and can be used in the project like this:
```tsx
import { Button, buttonVariants } from "@/components/ui/button";
/* ... */
<Button asChild variant="outline">
  <Link href={homePath}>Home</Link>
</Button>

// OR

<Link
  href={ticketsPath}
  className={buttonVariants({
    variant: "outline",
  })}
>
  Tickets
</Link>
/* ... */
```
- icons can be imported from `lucide-react` package, which is included with shadcn/ui, e.g.
```tsx
import { LucideCircleCheck, LucideFileText, LucidePencil } from "lucide-react";

const TICKET_ICONS = {
  OPEN: <LucideFileText />,
  IN_PROGRESS: <LucidePencil />,
  DONE: <LucideCircleCheck />,
};
```
- theme variables can be generated via the website and added to the project

## Dark mode

- Dark mode switching can be implemented using `next-themes` package.

1. [theme-provider.tsx](./the-road-to-next-app/src/components/theme/theme-provider.tsx)
2. [theme-switcher.tsx](./the-road-to-next-app//src/components/theme/theme-switcher.tsx)
3. [ThemeProvider in main layout](./the-road-to-next-app/src/app/layout.tsx)
4. [dark theme color variables in global styles](./the-road-to-next-app/src/app/globals.css)

## Data fetching, streaming, suspense & fallbacks

- Data can be fetched in server components by using async/await syntax, e.g.
```tsx
import { getTicket } from "@/features/ticket/queries/get-ticket";

const TicketPage = async () => {
  const ticket = await getTicket(params.ticketId);

  return (
   /* ... */
  );
};
```

- `<Suspense>` component can be used to show a fallback UI (spinner, etc.) while the data is being fetched, e.g.
```tsx
import { Suspense } from "react";
import { TicketList } from "@/features/ticket/components/ticket-list";
import { Spinner } from "@/features/ticket/components/ticket-list-skeleton";

const TicketListPage = async () => {

  return (
    <>
      <Suspense fallback={<Spinner />}>
      // data is fetched inside TicketList component
        <TicketList />
      </Suspense>
    </>
  );
};
export default TicketListPage;
```

- Whole page loading can be also implemented by creating a `loading.tsx` file in the same folder as the page, e.g. [loading.tsx](./the-road-to-next-app/src/app/tickets/[ticketId]/loading.tsx)
- Error cases can be handled in the same way by creating an `error.tsx` file, e.g. [error.tsx](./the-road-to-next-app/src/app/tickets/error.tsx)
  - or by using `ErrorBoundary` component from `react-error-boundary` package, e.g.
  ```tsx
  import { ErrorBoundary } from "react-error-boundary";
  import { TicketList } from "@/features/ticket/components/ticket-list";

  const TicketListPage = async () => {
    return (
      <>
        <ErrorBoundary fallback="Something went wrong!">
          <TicketList />
        </ErrorBoundary>
      </>
    );
  };
  export default TicketListPage;
  ```
- A not found case can be handled with a `not-found.tsx` file, e.g. [not-found.tsx](./the-road-to-next-app/src/app/tickets/[ticketId]/not-found.tsx). It can be used in combination with `notFound()` function from `next/navigation` package, e.g. [ticket.tsx](./the-road-to-next-app/src/app/tickets/[ticketId]/page.tsx)

## DB & ORM
- https://supabase.com/dashboard/project/
- `npm i prisma --save-dev`
- `npm install @prisma/client` installs the Prisma Client package
- `npx prisma init` initializes Prisma in the project & generates [schema.prisma](./the-road-to-next-app/prisma/schema.prisma)
- `npx prisma generate` updates the generated Prisma Client code
- add `"postinstall": "prisma generate"` to `package.json` scripts
- add `directUrl = env("DIRECT_URL")` to the datasource block in [schema.prisma](./the-road-to-next-app/prisma/schema.prisma)
- `npx prisma db push` to push the schema to the database
- data can be seeded to the DB using `PrismaClient`, e.g. [seed.ts](./the-road-to-next-app/prisma/seed.ts)
- DB data can be accessed via the Prisma Studio - `npx prisma studio`, http://localhost:5555/
- Prisma workaround for Next.js to prevent hot reloading issues [prisma.ts](./the-road-to-next-app/src/lib/prisma.ts)
  - prisma then can be used in the app like in [get-ticket.ts](./the-road-to-next-app/src/features/ticket/queries/get-ticket.ts) & [page.tsx](./the-road-to-next-app/src/app/tickets/[ticketId]/page.tsx)
- Types from Prisma Client can be used in the app, e.g. like in [ticket-item.tsx](./the-road-to-next-app/src/features/ticket/components/ticket-item.tsx)
