import { Plus } from "lucide-react"
import { Button } from "../../../components/ui/Button"

interface NewChatButtonProps {
  onClick?: () => void
  disabled?: boolean
}

export default function NewChatButton({
  onClick,
  disabled = false
}: NewChatButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl hover:bg-brand-primary/10 text-brand-primary"
      title="Start a new conversation"
    >
      <Plus className="w-6 h-6" />
    </Button>
  )
}
