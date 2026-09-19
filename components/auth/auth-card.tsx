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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signIn, signUp } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function AuthCard({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
  const [tab, setTab] = React.useState<"signin" | "signup">("signin")
  const [loading, setLoading] = React.useState(false)

  // Sign In state
  const [signInEmail, setSignInEmail] = React.useState("")
  const [signInPassword, setSignInPassword] = React.useState("")

  // Sign Up state
  const [signUpName, setSignUpName] = React.useState("")
  const [signUpEmail, setSignUpEmail] = React.useState("")
  const [signUpPassword, setSignUpPassword] = React.useState("")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInEmail || !signInPassword) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const res = await signIn.email({
        email: signInEmail,
        password: signInPassword,
      })

      if (res.error) {
        toast.error(res.error.message || "Failed to sign in")
      } else {
        toast.success("Signed in successfully!")
        onAuthSuccess?.()
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpName || !signUpEmail || !signUpPassword) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const res = await signUp.email({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
      })

      if (res.error) {
        toast.error(res.error.message || "Failed to sign up")
      } else {
        toast.success("Account created successfully!")
        onAuthSuccess?.()
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-border">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Authentication</CardTitle>
            <TabsList>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </div>
          <CardDescription>
            {tab === "signin"
              ? "Welcome back! Enter your credentials to access your account."
              : "Create a new account with email and password."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <TabsContent value="signin" className="mt-0">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Alex Doe"
                  autoComplete="name"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </CardContent>

        <CardFooter className="pt-0 text-xs text-muted-foreground justify-center">
          Powered by Better Auth v1.7.5
        </CardFooter>
      </Tabs>
    </Card>
  )
}
