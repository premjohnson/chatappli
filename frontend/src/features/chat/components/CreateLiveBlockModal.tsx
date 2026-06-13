import React, { useState } from "react";
import { ListTodo, BarChart3, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { createLiveBlockApi } from "../api/createLiveBlock.api";

interface CreateLiveBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onCreateSuccess: (blockId: string) => void;
}

const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const CreateLiveBlockModal: React.FC<CreateLiveBlockModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onCreateSuccess,
}) => {
  const [type, setType] = useState<"checklist" | "poll">("checklist");
  const [inputText, setInputText] = useState("");
  const [itemsList, setItemsList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddLocalItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (itemsList.includes(trimmed)) {
      setErrorMsg("This item already exists.");
      return;
    }
    setItemsList([...itemsList, trimmed]);
    setInputText("");
    setErrorMsg("");
  };

  const handleRemoveLocalItem = (index: number) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const handleTabChange = (newType: "checklist" | "poll") => {
    setType(newType);
    setInputText("");
    setItemsList([]);
    setErrorMsg("");
  };

  const handleCreate = async () => {
    if (type === "poll" && itemsList.length < 2) {
      setErrorMsg("A poll requires at least 2 options.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      let state = {};
      if (type === "checklist") {
        state = {
          items: itemsList.map((text) => ({
            id: generateUUID(),
            text,
            completed: false,
            completedBy: null,
          })),
        };
      } else {
        state = {
          options: itemsList.map((text) => ({
            id: generateUUID(),
            text,
            votes: [],
          })),
        };
      }

      const block = await createLiveBlockApi({
        conversationId,
        type,
        state,
      });

      onCreateSuccess(block.id);
      onClose();
      // Reset state
      setItemsList([]);
      setInputText("");
    } catch (err: any) {
      console.error("Failed to create liveblock:", err);
      setErrorMsg(
        err?.response?.data?.message || "Failed to create widget. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Collaborative Widget">
      <div className="space-y-6 select-none">
        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-950/5 rounded-2xl">
          <button
            type="button"
            onClick={() => handleTabChange("checklist")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
              type === "checklist"
                ? "bg-white text-gray-900 shadow-md shadow-black/5"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Checklist
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("poll")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
              type === "poll"
                ? "bg-white text-gray-900 shadow-md shadow-black/5"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Poll
          </button>
        </div>

        {/* Input addition */}
        <form onSubmit={handleAddLocalItem} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                type === "checklist"
                  ? "Enter checklist item..."
                  : "Enter poll option..."
              }
              label={
                type === "checklist"
                  ? "Checklist Item"
                  : "Poll Option"
              }
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="h-13 px-5 rounded-[1.5rem]"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </form>

        {/* Current Items List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {itemsList.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4">
              {type === "checklist"
                ? "No initial items added (can start empty)."
                : "Add at least 2 options for the poll."}
            </p>
          ) : (
            itemsList.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <span className="text-sm font-semibold text-gray-700 break-all">
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveLocalItem(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">
            {errorMsg}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isSubmitting}
            disabled={type === "poll" && itemsList.length < 2}
          >
            Create Widget
          </Button>
        </div>
      </div>
    </Modal>
  );
};
