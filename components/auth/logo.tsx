"use client"

import * as React from "react"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "inverse"
}

const sizeClasses = {
  sm: "h-6 w-6 text-base",
  md: "h-8 w-8 text-lg",
  lg: "h-10 w-10 text-xl",
}

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
}

export function Logo({
  className,
  size = "md",
  variant = "default",
}: LogoProps) {
  const brandColor = variant === "inverse" ? "text-brand-foreground" : "text-brand"

  return (
    <div
      className={`
        flex items-center gap-2 ${className}
      `}
      aria-hidden="true"
    >
      <svg
        className={`${sizeClasses[size]} ${brandColor} shrink-0`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Browser window frame */}
        <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
        {/* Tab bar */}
        <path d="M6 3v6M10 3v6M14 3v6M18 3v6" />
        {/* Address bar */}
        <path d="M6 11h12" />
        {/* Code/automation indicator - three dots representing nodes */}
        <circle cx="9" cy="15" r="1.5" fill="currentColor" />
        <circle cx="15" cy="15" r="1.5" fill="currentColor" />
        <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        {/* Connection lines */}
        <path d="M10.5 15h3M9 16.5l3 2.5M15 16.5l-3 2.5" />
      </svg>
      <span
        className={`
          font-semibold tracking-tight ${textSizeClasses[size]} ${brandColor}
        `}
      >
        Browser Automation
      </span>
    </div>
  )
}

export function LogoMark({
  className,
  size = 32,
  variant = "default",
}: {
  className?: string
  size?: number
  variant?: "default" | "inverse"
}) {
  const brandColor = variant === "inverse" ? "text-brand-foreground" : "text-brand"

  return (
    <svg
      className={`${brandColor} shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
      <path d="M6 3v6M10 3v6M14 3v6M18 3v6" />
      <path d="M6 11h12" />
      <circle cx="9" cy="15" r="1.5" fill="currentColor" />
      <circle cx="15" cy="15" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
      <path d="M10.5 15h3M9 16.5l3 2.5M15 16.5l-3 2.5" />
    </svg>
  )
}