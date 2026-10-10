import "server-only"

type SendEmailResponse = {
  data: { id: string } | null
  error: { message: string } | null
}

export const resend = {
  emails: {
    async send({
      from,
      to,
      subject,
      text,
    }: {
      from: string
      to: string
      subject: string
      text: string
    }): Promise<SendEmailResponse> {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        return {
          data: null,
          error: { message: "RESEND_API_KEY is not configured" },
        }
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, text }),
      })
      const result = (await response.json()) as
        { id: string } | { message?: string; error?: string }

      if (!response.ok || !("id" in result)) {
        return {
          data: null,
          error: {
            message:
              ("message" in result && result.message) ||
              ("error" in result && result.error) ||
              `Resend request failed (${response.status})`,
          },
        }
      }

      return { data: { id: result.id }, error: null }
    },
  },
}
