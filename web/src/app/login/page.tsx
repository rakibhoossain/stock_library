"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, Loader2, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      void api.getCurrentUser().then((user) => {
        if (user) {
          router.replace("/");
        }
      });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.login(email.trim(), password);
      router.push("/");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial-[at_top_right] from-indigo-900/20 via-zinc-950 to-zinc-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative background grid and gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-indigo-950/40">
          {/* Header branding */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center mb-1">
              <Image src="/logo.png" alt="Logo" width={40} height={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Fabric Stock Library
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Enterprise Textile Sourcing & Swatch Intelligence
              </p>
            </div>
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="pl-10 h-11 bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="pl-10 h-11 bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sign In to Stock Library
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <p className="text-[11px] font-medium text-zinc-400 text-center mb-3">
              Fast Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("admin@stocklibrary.com")}
                className="p-2.5 text-left rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/60 transition-colors text-xs"
              >
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
