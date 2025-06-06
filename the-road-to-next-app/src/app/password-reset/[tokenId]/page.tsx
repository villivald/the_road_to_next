import { CardCompact } from "@/components/card-compact";
import PasswordResetForm from "@/features/password/components/password-reset-form";

type ForgotResetPageProps = {
  params: Promise<{
    tokenId: string;
  }>;
};

const ForgotResetPage = async ({ params }: ForgotResetPageProps) => {
  const { tokenId } = await params;

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <CardCompact
        title="News Password"
        description="Enter a new password to reset your account"
        className="w-full max-w-[420px] animate-fade-from-top"
        content={<PasswordResetForm tokenId={tokenId} />}
      />
    </div>
  );
};

export default ForgotResetPage;
