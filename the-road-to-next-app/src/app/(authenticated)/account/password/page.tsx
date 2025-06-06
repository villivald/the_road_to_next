import { CardCompact } from "@/components/card-compact";
import Heading from "@/components/heading";
import PasswordChangeForm from "@/features/password/components/password-change-form";
import AccountTabs from "../_navigation/tabs";

const PasswordPage = () => {
  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Heading
        title="Password"
        description="Change your password"
        tabs={<AccountTabs />}
      />

      <div className="flex flex-1 flex-col items-center">
        <CardCompact
          title="Change Password"
          description="Enter your current password"
          className="w-full max-w-[420px] animate-fade-from-top"
          content={<PasswordChangeForm />}
        />
      </div>
    </div>
  );
};

export default PasswordPage;
