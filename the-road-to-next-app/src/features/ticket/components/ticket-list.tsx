import Placeholder from "@/components/placeholder";
import SearchInput from "@/components/search-input";
import SortSelect from "@/components/sort-select";
import TicketItem from "@/features/ticket/components/ticket-item";
import { getTickets } from "@/features/ticket/queries/get-tickets";
import { SearchParams } from "../search-params";

type TicketListProps = {
  userId?: string;
  searchParams: SearchParams;
};

const TicketList = async ({ userId, searchParams }: TicketListProps) => {
  const tickets = await getTickets(userId, searchParams);

  return (
    <div className="flex flex-1 animate-fade-from-top flex-col items-center gap-y-4">
      <div className="flex w-full max-w-[420px] gap-x-2">
        <SearchInput placeholder="Search tickets" />
        <SortSelect
          defaultValue="newest"
          options={[
            { value: "newest", label: "Newest" },
            { value: "bounty", label: "Bounty" },
          ]}
        />
      </div>

      {tickets.length ? (
        tickets.map((ticket) => <TicketItem key={ticket.id} ticket={ticket} />)
      ) : (
        <Placeholder label="No tickets found" />
      )}
    </div>
  );
};
export default TicketList;
