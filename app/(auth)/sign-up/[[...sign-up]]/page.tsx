import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="w-full flex justify-center py-6">
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-[#18181b] border border-neutral-800 shadow-2xl rounded-2xl text-white",
            headerTitle: "text-white font-semibold text-xl",
            headerSubtitle: "text-neutral-400 text-sm",
            socialButtonsBlockButton: "bg-[#222224] border-neutral-700/60 hover:bg-[#2c2c30] text-white",
            formButtonPrimary: "bg-purple-600 hover:bg-purple-500 text-white font-medium",
            formFieldInput: "bg-[#141416] border-neutral-700 text-white focus:border-purple-500",
            formFieldLabel: "text-neutral-300 text-xs font-medium",
            footerActionLink: "text-purple-400 hover:text-purple-300",
            identityPreviewText: "text-neutral-200",
          },
        }}
      />
    </div>
  )
}
