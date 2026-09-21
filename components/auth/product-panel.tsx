"use client"

import * as React from "react"
import { Globe, Database, Workflow, Terminal, CheckCircle, ShieldCheck, Wind } from "lucide-react"

interface ProductPanelProps {
  className?: string
}

export function ProductPanel({ className }: ProductPanelProps) {
  return (
    <div
      className={`
        ${className}
        hidden lg:flex lg:flex-col lg:items-center lg:justify-center
        lg:w-full lg:max-w-lg
        relative p-8 lg:p-12
        bg-gradient-to-br from-muted/30 via-background to-muted/30
        overflow-hidden
      `}
      aria-hidden="true"
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      {/* Floating decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-24 h-24 rounded-full bg-brand/5 blur-2xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-brand/3 blur-2xl animate-pulse-slow" style={{ animationDelay: "1s" }} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-xs font-medium mb-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse absolute inset-0 h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative block h-full w-full rounded-full bg-brand" />
            </span>
            Automating browsers
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
            Build automations.{" "}
            <span className="text-brand">Ship faster.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Create powerful browser workflows with code. Schedule, monitor, and scale your automations
            without managing infrastructure.
          </p>
        </div>

        {/* Visual workflow representation */}
        <div className="relative w-full">
          {/* Browser window mockup */}
          <div className="rounded-xl border border-border/30 bg-card/50 p-3 shadow-lg">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border/20">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/60" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                <div className="w-2 h-2 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 bg-muted/30 rounded-md h-4" />
              <div className="text-xs text-muted-foreground font-mono">browser-automation.dev</div>
            </div>

            {/* Dashboard area */}
            <div className="space-y-2">
              <div className="bg-card/30 rounded-lg p-3 border border-border/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Workflow Status</span>
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="size-3.5" /> Ready
                  </span>
                </div>
                <div className="bg-muted/40 rounded-md p-2 font-mono text-xs text-muted-foreground">
                  {`> npm run automate
  ✓ Navigate: example.com
  ✓ Extract: dashboard-data
  ✓ Submit: form-data`}<br />
                  <span className="text-emerald-500">✨ Workflow complete in 1.2s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connection lines between steps */}
          <div className="absolute top-28 left-1/2 -translate-x-1/2 w-px h-12 bg-border/30"></div>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-brand" />
            <span>Type-safe TypeScript</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <CheckCircle className="size-4 text-brand" />
            <span>Secure by default</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="size-4 text-brand" />
            <span>Run locally or cloud</span>
          </div>
        </div>
      </div>
    </div>
  )
}