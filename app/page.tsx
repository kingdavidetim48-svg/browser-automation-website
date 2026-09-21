"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import { UserProfile } from "@/components/auth/user-profile"
import { ProductPanel } from "@/components/auth/product-panel"
import { useSession } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

export default function Page() {
  const { data: session, isPending } = useSession()

  return (
    <div className="bg-background min-h-svh">
      {/* Desktop split-screen layout */}
      <div className="container relative hidden min-h-svh items-center justify-center lg:grid lg:grid-cols-2 lg:gap-0 lg:px-8">
        {/* Auth form side */}
        <div className="flex justify-center p-6 lg:p-0">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }))
                }}
              >
                Toggle theme
              </Button>
            </div>

            {isPending ? (
              <div className="flex justify-center p-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : session?.user ? (
              <UserProfile />
            ) : (
              <AuthCard onAuthSuccess={() => {}} />
            )}
          </div>
        </div>

        {/* Product showcase side */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <ProductPanel />
        </div>
      </div>

      {/* Mobile layout - stacked */}
      <div className="lg:hidden flex min-h-svh flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {isPending ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : session?.user ? (
            <UserProfile />
          ) : (
            <AuthCard onAuthSuccess={() => {}} />
          )}
        </div>
      </div>
    </div>
  )
}
