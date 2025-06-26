import { CardCompact } from "@/components/card-compact";
import EmailVerificationForm from "@/features/auth/components/email-verification-form";
import EmailVerificationResendForm from "@/features/auth/components/email-verification-resend-form";

const EmailVerificationPage = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <CardCompact
        title="Verify Email"
        description="Please verify your email address to continue"
        className="w-full max-w-[420px] animate-fade-from-top"
        content={
          <div className="flex flex-col gap-y-2">
            <EmailVerificationForm />
            <EmailVerificationResendForm />
          </div>
        }
      />
    </div>
  );
};

export default EmailVerificationPage;
