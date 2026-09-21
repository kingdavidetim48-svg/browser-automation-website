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
import { Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react"

export function AuthCard({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
  const [tab, setTab] = React.useState<"signin" | "signup">("signin")
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Sign In state
  const [signInEmail, setSignInEmail] = React.useState("")
  const [signInPassword, setSignInPassword] = React.useState("")

  // Sign Up state
  const [signUpName, setSignUpName] = React.useState("")
  const [signUpEmail, setSignUpEmail] = React.useState("")
  const [signUpPassword, setSignUpPassword] = React.useState("")

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    if (!signInEmail || !signInPassword) {
      setErrors({
        ...( !signInEmail && { email: "Email is required" }),
        ...( !signInPassword && { password: "Password is required" }),
      })
      toast.error("Please fill in all fields")
      return
    }
    if (!validateEmail(signInEmail)) {
      setErrors({ email: "Please enter a valid email" })
      toast.error("Please enter a valid email")
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

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    if (!signUpName || !signUpEmail || !signUpPassword) {
      setErrors({
        ...( !signUpName && { name: "Name is required" }),
        ...( !signUpEmail && { email: "Email is required" }),
        ...( !signUpPassword && { password: "Password is required" }),
      })
      toast.error("Please fill in all fields")
      return
    }
    if (!validateEmail(signUpEmail)) {
      setErrors({ email: "Please enter a valid email" })
      toast.error("Please enter a valid email")
      return
    }
    if (signUpPassword.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" })
      toast.error("Password must be at least 6 characters")
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
    <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl">
      <CardHeader className="space-y-4 pb-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
            <svg
              className="h-5 w-5 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <path d="M6 3v6M10 3v6M14 3v6M18 3v6" />
              <path d="M6 11h12" />
              <circle cx="9" cy="15" r="1.5" fill="currentColor" />
              <circle cx="15" cy="15" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-foreground">
            Browser Automation
          </span>
        </div>

        {/* Segmented control */}
        <Tabs value={tab} onValueChange={(v) => { setTab(v as "signin" | "signup"); setErrors({}) }}>
          <TabsList className="relative w-full rounded-xl bg-muted p-[3px]">
            <TabsTrigger
              value="signin"
              className="relative z-10 flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="relative z-10 flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Subtitle */}
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground">
          {tab === "signin"
            ? "Sign in to continue building and running browser automations."
            : "Create your account. Start building browser automations in minutes."}
        </CardDescription>
      </CardHeader>

      <CardContent>
      <Tabs>
          <TabsContent value="signin" className="mt-0 space-y-3">
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  disabled={loading}
                  required
                  className={errors.email ? "border-destructive focus-visible:border-destructive" : ""}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <a
                  href="#"
                  className="text-xs text-brand hover:underline focus-visible:outline-none focus-visible:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  disabled={loading}
                  required
                  className={errors.password ? "border-destructive focus-visible:border-destructive" : ""}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-1 h-11 bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl font-medium shadow-lg shadow-brand/20 transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl border-border/50 bg-background hover:bg-muted/50"
              onClick={() => toast.info("Google sign-in coming soon")}
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl border-border/50 bg-background hover:bg-muted/50"
              onClick={() => toast.info("GitHub sign-in coming soon")}
            >
              <svg className="mr-2 size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="signup" className="mt-0 space-y-3">
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Alex Doe"
                  autoComplete="name"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  disabled={loading}
                  required
                  className={errors.name ? "border-destructive focus-visible:border-destructive" : ""}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  disabled={loading}
                  required
                  className={errors.email ? "border-destructive focus-visible:border-destructive" : ""}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  disabled={loading}
                  required
                  className={errors.password ? "border-destructive focus-visible:border-destructive" : ""}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-1 h-11 bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl font-medium shadow-lg shadow-brand/20 transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl border-border/50 bg-background hover:bg-muted/50"
              onClick={() => toast.info("Google sign-up coming soon")}
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl border-border/50 bg-background hover:bg-muted/50"
              onClick={() => toast.info("GitHub sign-up coming soon")}
            >
              <svg className="mr-2 size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      </CardContent>

      <CardFooter className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <a href="#" className="text-brand hover:underline focus-visible:outline-none focus-visible:underline">
            Better Auth v1.7.5
          </a>
        </p>
      </CardFooter>
    </Card>
  )
// }The glob output is ambiguous and interleaved. Let me stop relying on relative glob paths and read the actual files directly using their absolute paths. First, let me confirm the exact structure with a precise PowerShell listing scoped to the project root only (no recursion), then read the key files