## Misc

- Plugin for sorting imports `eslint-plugin-simple-import-sort`
  - see usage example in [eslint config](./the-road-to-next-app/eslint.config.mjs)
- Absolute imports can be used in Next.js by adding a `@` prefix to the import path.
  - E.g. `import { data } from "@/data.ts"` instead of `import { data } from "../../../data.ts"` (assuming the file is in `/src` folder)


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