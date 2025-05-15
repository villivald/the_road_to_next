import Link from "next/link";
import { CardCompact } from "@/components/card-compact";
import SignInForm from "@/features/auth/components/sign-in-form";
import { passwordForgotPath, signUpPath } from "@/paths";

const SignUp = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <CardCompact
        title="Sign In"
        description="Welcome back! Please sign in to your account."
        className="w-full max-w-[420px] animate-fade-from-top"
        content={<SignInForm />}
        footer={
          <div className="flex w-full items-center justify-between">
            <Link href={signUpPath} className="text-sm text-muted-foreground">
              No account yet? Sign up
            </Link>

            <Link
              href={passwordForgotPath}
              className="text-sm text-muted-foreground"
            >
              Forgot password?
            </Link>
          </div>
        }
      />
    </div>
  );
};

export default SignUp;
