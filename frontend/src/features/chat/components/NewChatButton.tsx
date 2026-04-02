interface NewChatButtonProps {
  onClick?: () => void
  disabled?: boolean
}

export default function NewChatButton({
  onClick,
  disabled = false
}: NewChatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Start a new conversation"
    >
      <svg
        className="w-5 h-5 text-gray-700"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
