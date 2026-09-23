"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";

function getErrorMessage(error: { message?: string }) {
  console.error("Google sign-in failed", error);
  return error.message || "Google sign-in failed. Please try again.";
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const { signIn } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    if (!signIn) {
      return;
    }

    setError(null);
    setPending(true);

    // Full OAuth redirect (unlike One Tap) so Google shows the account
    // chooser and Clerk stores an access token for the dashboard.
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/",
      redirectCallbackUrl: "/sso-callback",
    });

    if (error) {
      setPending(false);
      setError(getErrorMessage(error));
    }
  };

  return (
    <div className="flex w-full max-w-80 flex-col items-center gap-3">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={!signIn || pending}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
      >
        <GoogleLogo />
        {pending ? "Redirecting to Google…" : "Sign in with Google"}
      </button>
      {error ? (
        <p role="alert" className="text-center text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
