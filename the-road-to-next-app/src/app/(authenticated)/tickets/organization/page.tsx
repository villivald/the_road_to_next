import { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { CardCompact } from "@/components/card-compact";
import Heading from "@/components/heading";
import Spinner from "@/components/spinner";
import TicketList from "@/features/ticket/components/ticket-list";
import { TicketUpsertForm } from "@/features/ticket/components/ticket-upsert-form";
import { searchParamsCache } from "@/features/ticket/search-params";

type TicketsByOrganizationProps = {
  searchParams: SearchParams;
};

const TicketsByOrganization = async ({
  searchParams,
}: TicketsByOrganizationProps) => {
  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Heading
        title="Our Tickets"
        description="All your related to my organization"
      />

      <CardCompact
        title="Create Tickets"
        description="A new ticket will be created"
        className="w-full max-w-[420px] self-center"
        content={<TicketUpsertForm />}
      />

      <Suspense fallback={<Spinner />}>
        <TicketList
          byOrganization
          searchParams={await searchParamsCache.parse(searchParams)}
        />
      </Suspense>
    </div>
  );
};

export default TicketsByOrganization;
