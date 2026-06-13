import { getSocket, MESSAGE_EVENTS } from "./socket"
import { queryClient } from "./queryClient"
import type { Message } from "../features/message/types/message.types"

export const registerSocketListeners = () => {

  const socket = getSocket()

  if (!socket) return

  socket.off(MESSAGE_EVENTS.NEW)
  socket.off("liveblock:update")

  socket.on(MESSAGE_EVENTS.NEW, (message: Message) => {

    queryClient.setQueryData(
      ["messages", message.conversation],
      (old: any) => {

        if (!old) return old

        const pages = [...old.pages]
        pages[0] = [message, ...pages[0]]

        return { ...old, pages }
      }
    )

    queryClient.setQueryData(["conversations"], (old: any) => {

      if (!Array.isArray(old)) return old

      return old.map((c: any) =>
        c._id === message.conversation
          ? { ...c, lastMessage: message }
          : c
      )
    })

  })

  socket.on("liveblock:update", (update: {
    blockId: string
    state: any
    version: number
    isFrozen: boolean
  }) => {
    queryClient.setQueryData(["liveblock", update.blockId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        state: update.state,
        version: update.version,
        isFrozen: update.isFrozen,
      }
    })
  })

}