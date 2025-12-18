/**
 * Purpose: Staff/Manager/Admin registration page with invite code.
 * PROTECTED registration portal requiring valid invite code.
 * Role is determined by the invite code, not user selection.
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StaffRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Success! Force a full page reload to ensure session is established
      // Middleware will redirect to /staff for staff/manager/admin
      window.location.href = "/";
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
            Staff Registration
          </h1>
          <p className="mt-2 text-sm text-[hsl(25,20%,40%)]">
            Create your staff account using an invite code
          </p>
        </header>

        <section>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You need a valid invite code from an
                administrator to register as staff, manager, or admin.
              </p>
            </div>

            <div>
              <label
                htmlFor="inviteCode"
                className="block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Invite Code
              </label>
              <input
                id="inviteCode"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[hsl(25,20%,80%)] px-3 py-2 shadow-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                placeholder="Enter your invite code"
              />
              <p className="mt-1 text-xs text-[hsl(25,20%,40%)]">
                Your role will be determined by this invite code
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[hsl(25,20%,80%)] px-3 py-2 shadow-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[hsl(25,20%,80%)] px-3 py-2 shadow-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[hsl(25,20%,80%)] px-3 py-2 shadow-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Staff Account"}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm text-[hsl(25,20%,40%)]">
            <p>
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-[hsl(25,35%,25%)] hover:text-[hsl(25,40%,15%)]"
              >
                Login here
              </Link>
            </p>
            <p>
              Customer without invite code?{" "}
              <Link
                href="/auth/register"
                className="font-medium text-[hsl(25,35%,25%)] hover:text-[hsl(25,40%,15%)]"
              >
                Register as customer
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
