"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/auth-card";
import { Logo } from "@/components/auth/logo";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="bg-background min-h-svh flex">
      {/* Desktop: split layout */}
      <div className="flex lg:flex-row flex-col items-center justify-center min-h-svh w-full">
        {/* Branding/Product Info Side */}
        <div className="flex lg:w-1/2 lg:items-center lg:justify-center w-full lg:px-12 px-6 py-8">
          <div className="text-center space-y-6 max-w-xl">
            <Logo className="mb-4" />
            <h1 className="text-3xl font-bold text-foreground">
              Browser Automation
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Build, run, and scale browser automations with code.
              No infrastructure to manage.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Go to Dashboard →
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Auth Card Side */}
        <div className="flex lg:w-1/2 lg:items-center lg:justify-center w-full lg:px-12 px-6 py-8">
          <div className="w-full max-w-md space-y-4">
            {isPending ? (
              <div className="flex justify-center p-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : session?.user ? (
              <div className="space-y-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Welcome back, {session.user.name}!
                </h2>
                <p className="text-muted-foreground">
                  You are now signed in to Browser Automation.
                </p>
                <div className="flex justify-center gap-3">
                  <Link href="/dashboard">
                    <Button size="sm">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = "/api/auth/signout";
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <AuthCard onAuthSuccess={() => {
                window.location.href = "/dashboard";
              }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
