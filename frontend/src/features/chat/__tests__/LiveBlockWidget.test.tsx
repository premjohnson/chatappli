import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryClient } from "../../../lib/queryClient";
import { registerSocketListeners } from "../../../lib/socket.listeners";
import { getSocket } from "../../../lib/socket";
import * as socketModule from "../../../lib/socket";

// Mock the socket module
vi.mock("../../../lib/socket", () => {
  const listeners: Record<string, Function[]> = {};
  const mockSocket = {
    connected: true,
    off: vi.fn((event: string) => {
      delete listeners[event];
      return mockSocket;
    }),
    on: vi.fn((event: string, cb: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return mockSocket;
    }),
    emit: vi.fn(),
  };

  return {
    getSocket: () => mockSocket,
    emitLiveBlockAction: vi.fn(),
    MESSAGE_EVENTS: {
      NEW: "message:new",
    },
    // Export trigger helper so the test can call it by importing from the mocked module
    triggerSocketEvent: (event: string, payload: any) => {
      if (listeners[event]) {
        listeners[event].forEach((cb) => cb(payload));
      }
    },
  };
});

// Mock the queryClient
vi.mock("../../../lib/queryClient", () => ({
  queryClient: {
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
}));

describe("LiveBlock WebSocket Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register liveblock:update listener", () => {
    registerSocketListeners();
    const socket = getSocket();
    expect(socket?.on).toHaveBeenCalledWith("liveblock:update", expect.any(Function));
  });

  it("should update React Query cache on liveblock:update socket event", () => {
    registerSocketListeners();

    // Mock initial query state
    const mockOldState = {
      id: "block123",
      conversationId: "convo456",
      type: "checklist",
      state: { items: [] },
      version: 1,
      isFrozen: false,
    };

    // Set up setQueryData mock to run the updater callback
    const setQueryDataMock = vi.mocked(queryClient.setQueryData);
    setQueryDataMock.mockImplementation((_key: any, updater: any) => {
      if (typeof updater === "function") {
        return updater(mockOldState);
      }
      return updater;
    });

    const updatePayload = {
      blockId: "block123",
      state: {
        items: [{ id: "item1", text: "Test Item", completed: true, completedBy: "user999" }],
      },
      version: 2,
      isFrozen: true,
    };

    // Get trigger helper from top-level import using type cast
    const { triggerSocketEvent } = socketModule as any;

    // Trigger the socket event
    triggerSocketEvent("liveblock:update", updatePayload);

    // Verify cache update call
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ["liveblock", "block123"],
      expect.any(Function)
    );

    // Verify the state was updated correctly inside the updater callback
    const result = setQueryDataMock.mock.results[0].value;
    expect(result).toEqual({
      id: "block123",
      conversationId: "convo456",
      type: "checklist",
      state: updatePayload.state,
      version: 2,
      isFrozen: true,
    });
  });
});
