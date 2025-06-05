import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuth } from "@/features/auth/actions/get-auth";
import { User } from "@/generated/prisma";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isFetched, setIsFetched] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const { user } = await getAuth();
      setUser(user);
      setIsFetched(true);
    };

    fetchUser();
  }, [pathname]);

  return { user, isFetched };
};
