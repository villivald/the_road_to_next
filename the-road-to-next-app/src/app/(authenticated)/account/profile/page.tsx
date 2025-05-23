import Heading from "@/components/heading";
import AccountTabs from "../_navigation/tabs";

const ProfilePage = () => {
  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Heading
        title="Profile"
        description="Manage your profile settings"
        tabs={<AccountTabs />}
      />
    </div>
  );
};

export default ProfilePage;
