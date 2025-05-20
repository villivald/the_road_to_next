import { Suspense } from "react";
import Heading from "@/components/heading";
import Spinner from "@/components/spinner";
import TicketList from "@/features/ticket/components/ticket-list";
import { SearchParams } from "@/features/ticket/search-params";

type HomePageProps = {
  searchParams: SearchParams;
};

const HomePage = async ({ searchParams }: HomePageProps) => {
  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Heading title="All Tickets" description="All tickets from every user" />

      <Suspense fallback={<Spinner />}>
        <TicketList searchParams={await searchParams} />
      </Suspense>
    </div>
  );
};

export default HomePage;
