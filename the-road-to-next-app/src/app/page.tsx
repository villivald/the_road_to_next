import Link from "next/link";
import { ticketsPath } from "@/paths";

const HomePage = () => {
  return (
    <div>
      <h1 className="text-lg">Welcome to the Home Page</h1>
      <Link href={ticketsPath} className="underline">
        Tickets
      </Link>
    </div>
  );
};

export default HomePage;
