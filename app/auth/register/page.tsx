/**
 * Purpose: Customer registration page.
 * PUBLIC registration portal for customers only.
 * Staff/manager/admin must use /auth/register/staff with invite code.
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Success! Force a full page reload to ensure session is established
      // Middleware will automatically redirect to /menu for customers
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
            Register
          </h1>
          <p className="mt-2 text-sm text-[hsl(25,20%,40%)]">
            Create your Café Aroma account
          </p>
        </header>

        <section>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

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
              {loading ? "Creating account..." : "Create Account"}
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
              Staff member with invite code?{" "}
              <Link
                href="/auth/register/staff"
                className="font-medium text-[hsl(25,35%,25%)] hover:text-[hsl(25,40%,15%)]"
              >
                Register as staff
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
