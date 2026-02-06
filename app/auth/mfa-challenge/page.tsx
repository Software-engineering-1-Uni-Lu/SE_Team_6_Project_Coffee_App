/**
 * Purpose: MFA challenge page shown when staff/admin login requires TOTP verification.
 * Users enter their authenticator app code to complete login.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/integrations/supabase/client";
import { toast } from "sonner";

export default function MFAChallengePageWrapper() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const loadFactors = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error || !data.totp || data.totp.length === 0) {
        // No MFA factors, redirect to login
        router.push("/auth/login");
        return;
      }

      // Use the first verified TOTP factor
      const verifiedFactor = data.totp.find((f) => f.status === "verified");
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      } else {
        router.push("/auth/login");
        return;
      }

      setLoading(false);
    };

    loadFactors();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !code.trim()) return;

    setVerifying(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      toast.success("Verification successful");
      router.push("/staff");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
          <p className="mt-4 text-[hsl(25,35%,45%)]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(35,20%,97%)]">
      <div className="w-full max-w-md rounded-lg border border-[hsl(35,20%,90%)] bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-[hsl(25,35%,25%)]">
          Two-Factor Authentication
        </h1>
        <p className="mb-6 text-sm text-[hsl(25,35%,55%)]">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <form onSubmit={handleVerify}>
          <div className="mb-4">
            <label
              htmlFor="mfa-code"
              className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Verification Code
            </label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-3 text-center font-mono text-2xl tracking-widest text-[hsl(25,35%,25%)] focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,35%,25%)] focus:ring-opacity-20"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </main>
  );
}
