"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";

export default function TestPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="size-6" />
          </div>
          <CardTitle className="text-2xl">Protected Test Page</CardTitle>
          <p className="text-muted-foreground">
            This page is protected by the middleware. You should only see this if authenticated.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="font-medium">Session Status:</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Authenticated
              </span>
            </div>
            {session?.user && (
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {session.user.name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {session.user.email}
                </p>
                <p>
                  <span className="font-medium">Email Verified:</span>{" "}
                  {session.user.emailVerified ? "Yes" : "No"}
                </p>
              </div>
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}