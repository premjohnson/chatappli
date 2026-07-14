import { beforeEach, describe, expect, it } from "vitest"
import { useContextMenuStore } from "./contextMenu.store"
import type { Message } from "../features/message/types/message.types"

const message = (id: string, clientMessageId = id): Message => ({
  _id: id,
  clientMessageId,
  conversation: "conversation-a",
  sender: "user-a",
  encryptedContent: "ciphertext",
  type: "text",
  deliveryReceipts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
})

describe("MessageContextMenu message identity", () => {
  beforeEach(() => {
    useContextMenuStore.setState({
      isOpen: false,
      x: 0,
      y: 0,
      message: null,
      selectedMessageIds: [],
      isSelectionMode: false,
      replyingToMessage: null,
      editingMessage: null
    })
  })

  it("replaces the selected message during rapid opens", () => {
    const first = message("first")
    const last = message("last")
    const store = useContextMenuStore.getState()
    const mockEl1 = document.createElement("div")
    const mockEl2 = document.createElement("div")

    store.openContextMenu(first, mockEl1)
    store.openContextMenu(last, mockEl2)

    expect(useContextMenuStore.getState()).toMatchObject({
      isOpen: true,
      message: last,
      messageElement: mockEl2
    })
  })

  it("promotes every menu reference from an optimistic id to the server id", () => {
    const optimistic = message("client-1")
    const confirmed = message("server-1", "client-1")
    const store = useContextMenuStore.getState()
    const mockEl = document.createElement("div")

    store.openContextMenu(optimistic, mockEl)
    store.setReplyingToMessage(optimistic)
    store.setEditingMessage(optimistic)
    store.setSelectionMode(true)
    store.toggleSelectMessage(optimistic._id)
    store.reconcileMessage(confirmed)

    const state = useContextMenuStore.getState()
    expect(state.message?._id).toBe("server-1")
    expect(state.replyingToMessage?._id).toBe("server-1")
    expect(state.editingMessage?._id).toBe("server-1")
    expect(state.selectedMessageIds).toEqual(["server-1"])
  })

  it("only closes or clears state for the message that was removed", () => {
    const selected = message("selected")
    const other = message("other")
    const store = useContextMenuStore.getState()
    const mockEl = document.createElement("div")

    store.openContextMenu(selected, mockEl)
    store.removeMessage(other._id)
    expect(useContextMenuStore.getState().message?._id).toBe(selected._id)

    store.removeMessage(selected._id)
    expect(useContextMenuStore.getState()).toMatchObject({ isOpen: false, message: null })
  })
})
