import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-8">
      <Image src="/asc-logo.png" alt="Austin STEM Center logo" width={240} height={242} priority className="h-auto w-full max-w-60" />
      <div className="text-center">
        <h1 className="text-xl font-semibold">ASC CRM</h1>
        <p className="mt-1 text-sm text-stone-500">Sign in with your austinstemcenter.org Google account.</p>
      </div>
      <GoogleSignInButton />
    </div>
  );
}
