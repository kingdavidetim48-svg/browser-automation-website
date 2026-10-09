import { resend } from "@/lib/resend"

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured; set it to a sender address verified with Resend."
    )
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text: body,
  })

  // The REST adapter returns { data, error }; throw so the run accurately marks
  // this step failed instead of reporting a successful notification.
  if (error || !data) {
    throw new Error(error?.message ?? "Resend returned no email id")
  }

  return { id: data.id }
}
