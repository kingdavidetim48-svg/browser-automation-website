"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { signOut, useSession } from "@/lib/auth-client"
import { toast } from "sonner"
import { LogOut, UserCheck, ShieldCheck, Loader2 } from "lucide-react"

export function UserProfile() {
  const { data: session, isPending } = useSession()
  const [loggingOut, setLoggingOut] = React.useState(false)

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      toast.success("Signed out successfully!")
    } catch {
      toast.error("Failed to sign out")
    } finally {
      setLoggingOut(false)
    }
  }

  if (isPending) {
    return (
      <Card className="w-full max-w-md p-6 flex items-center justify-center border-border">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  if (!session?.user) {
    return null
  }

  const { user } = session

  return (
    <Card className="w-full max-w-md border-border shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-1.5">
              {user.name}
              <UserCheck className="size-4 text-emerald-500 inline" />
            </CardTitle>
            <CardDescription className="text-xs">{user.email}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        <div className="rounded-lg bg-muted/60 p-3 space-y-1.5">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>User ID</span>
            <span className="font-mono text-[11px] text-foreground truncate max-w-[180px]">
              {user.id}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Email Verified</span>
            <span className="font-medium text-foreground">
              {user.emailVerified ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Session Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="size-3.5" /> Active
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  )
}
