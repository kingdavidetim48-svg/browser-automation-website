import * as React from "react"
import { ProductPanel } from "@/features/auth/components/product-panel"
import { Logo } from "@/components/shared/logo"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Product / Brand showcase on desktop */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen border-r border-neutral-800/60 bg-[#0d0d0f] items-center justify-center p-8">
        <div className="w-full max-w-md">
          <ProductPanel />
        </div>
      </div>

      {/* Auth Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative min-h-screen bg-[#141416]">
        <div className="absolute top-6 left-6 lg:left-12 flex items-center">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo size="md" />
          </Link>
        </div>

        <div className="w-full max-w-md flex flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  )
}
