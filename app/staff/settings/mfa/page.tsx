/**
 * Purpose: MFA enrollment page for staff/admin users.
 * Allows users to set up TOTP-based two-factor authentication.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/src/integrations/supabase/client";
import { toast } from "sonner";

export default function MFASettingsPage() {
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMfaStatus = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();

      if (data?.totp && data.totp.some((f) => f.status === "verified")) {
        setMfaEnabled(true);
      }
      setLoading(false);
    };

    checkMfaStatus();
  }, []);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const response = await fetch("/api/auth/mfa/enroll", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start MFA enrollment");
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setFactorId(data.factorId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start enrollment"
      );
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !verifyCode.trim()) return;

    setVerifying(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: verifyCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      toast.success("Two-factor authentication enabled!");
      setMfaEnabled(true);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setVerifyCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = data?.totp?.find((f) => f.status === "verified");

      if (verifiedFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: verifiedFactor.id,
        });
        if (error) throw error;
      }

      setMfaEnabled(false);
      toast.success("Two-factor authentication disabled");
    } catch (err) {
      toast.error("Failed to disable MFA");
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[hsl(25,35%,25%)]">
        Two-Factor Authentication
      </h1>
      <p className="mb-8 text-[hsl(25,35%,55%)]">
        Add an extra layer of security to your account using an authenticator
        app.
      </p>

      {mfaEnabled && !qrCode && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#x2713;</span>
            <div>
              <h2 className="font-semibold text-green-800">MFA is enabled</h2>
              <p className="text-sm text-green-700">
                Your account is protected with two-factor authentication.
              </p>
            </div>
          </div>
          <button
            onClick={handleUnenroll}
            className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Disable MFA
          </button>
        </div>
      )}

      {!mfaEnabled && !qrCode && (
        <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold text-[hsl(25,35%,25%)]">
            Set up authenticator
          </h2>
          <p className="mb-4 text-sm text-[hsl(25,35%,55%)]">
            Use an authenticator app like Google Authenticator, Authy, or
            1Password to generate verification codes.
          </p>
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="rounded-md bg-[hsl(25,35%,25%)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enrolling ? "Setting up..." : "Set up MFA"}
          </button>
        </div>
      )}

      {qrCode && (
        <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[hsl(25,35%,25%)]">
            Scan QR Code
          </h2>
          <p className="mb-4 text-sm text-[hsl(25,35%,55%)]">
            Scan this QR code with your authenticator app, then enter the
            6-digit code below to verify.
          </p>

          <div className="mb-4 flex justify-center">
            {/* QR code is returned as an SVG data URI */}
            <Image
              src={qrCode}
              alt="MFA QR Code"
              width={200}
              height={200}
              className="rounded-lg border border-[hsl(35,20%,90%)]"
              unoptimized
            />
          </div>

          {secret && (
            <div className="mb-4 rounded-md bg-[hsl(35,20%,95%)] p-3">
              <p className="mb-1 text-xs font-medium text-[hsl(25,35%,45%)]">
                Manual entry key:
              </p>
              <code className="font-mono text-sm text-[hsl(25,35%,25%)]">
                {secret}
              </code>
            </div>
          )}

          <form onSubmit={handleVerifyEnrollment}>
            <label
              htmlFor="verify-code"
              className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Verification Code
            </label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verifyCode}
              onChange={(e) =>
                setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="mb-4 w-full rounded-md border border-[hsl(35,20%,90%)] px-4 py-3 text-center font-mono text-2xl tracking-widest text-[hsl(25,35%,25%)]"
              autoFocus
              autoComplete="one-time-code"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={verifying || verifyCode.length !== 6}
                className="flex-1 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Verify & Enable"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQrCode(null);
                  setSecret(null);
                  setFactorId(null);
                  setVerifyCode("");
                }}
                className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,45%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
