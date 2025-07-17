import { useLoaderData } from '@tanstack/react-router'

interface FeedbackContactProps {
  phoneNumber: string | null
}

export function FeedbackContact({ phoneNumber }: FeedbackContactProps) {
  if (!phoneNumber) return null

  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`

  return (
    <div className="text-slate-400 font-mono text-xs text-center">
      <span>Send feedback & feature requests: </span>
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
      >
        Message us on WhatsApp ({ phoneNumber })
      </a>
    </div>
  )
}