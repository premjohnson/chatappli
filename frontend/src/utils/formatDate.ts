export function formatDate(dateString: string | undefined): string {
    if (!dateString) return ""

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""

    const now = new Date()
    const diffInMs = Math.abs(now.getTime() - date.getTime())

    // less than a day
    if (diffInMs < 1000 * 60 * 60 * 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // more than a day
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
