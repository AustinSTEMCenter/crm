"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  const clerk = useClerk();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void clerk
      .handleRedirectCallback({ signInForceRedirectUrl: "/", signUpForceRedirectUrl: "/" })
      .catch((e: unknown) => {
        console.error("Google sign-in callback failed", e);
        setError(e instanceof Error && e.message ? e.message : "Google sign-in could not be completed.");
      });
  }, [clerk]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      {error ? (
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold">Google sign-in failed</h1>
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
          <Link href="/sign-in" className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium">
            Back to sign in
          </Link>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Completing sign-in…</p>
      )}
    </main>
  );
}
