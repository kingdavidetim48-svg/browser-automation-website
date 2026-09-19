"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import { UserProfile } from "@/components/auth/user-profile"
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function Page() {
  const { data: session, isPending } = useSession()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Browser Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            {session?.user
              ? "You are authenticated with Better Auth."
              : "Sign in or create an account to get started."}
          </p>
        </div>

        {isPending ? (
          <div className="flex justify-center p-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : session?.user ? (
          <UserProfile />
        ) : (
          <AuthCard />
        )}

        <div className="flex flex-col items-center gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Toast notifications are working properly!")}
          >
            Test Sonner Toast
          </Button>
          <div className="font-mono text-xs text-muted-foreground">
            (Press <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] bg-muted">d</kbd> to toggle dark mode)
          </div>
        </div>
      </div>
    </div>
  )
}
