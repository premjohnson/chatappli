import React, { useState } from "react";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LiveBlock } from "../types/liveblock.types";

interface ChecklistWidgetProps {
  block: LiveBlock;
  onAction: (type: string, payload?: any) => void;
}

export const ChecklistWidget: React.FC<ChecklistWidgetProps> = ({
  block,
  onAction,
}) => {
  const [newItemText, setNewItemText] = useState("");
  const items = block.state?.items || [];
  const isFrozen = block.isFrozen;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || isFrozen) return;
    onAction("ADD_ITEM", { text: newItemText.trim() });
    setNewItemText("");
  };

  return (
    <div className="space-y-4 text-gray-800">
      {/* Items List */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2 text-center">
            No items in checklist yet.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
            >
              <button
                type="button"
                disabled={isFrozen}
                onClick={() => onAction("TOGGLE_ITEM", { itemId: item.id })}
                className={`flex items-center gap-3 flex-1 text-left ${
                  isFrozen ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <span className="flex-shrink-0 transition-transform active:scale-95 text-brand-primary">
                  {item.completed ? (
                    <CheckSquare className="w-5 h-5 fill-brand-primary/10" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </span>
                <span
                  className={`text-[14px] leading-tight select-none font-medium break-all ${
                    item.completed
                      ? "line-through text-gray-400 font-normal"
                      : "text-gray-700"
                  }`}
                >
                  {item.text}
                </span>
              </button>

              {!isFrozen && (
                <button
                  type="button"
                  onClick={() => onAction("REMOVE_ITEM", { itemId: item.id })}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Item Form */}
      {!isFrozen && (
        <form onSubmit={handleAddItem} className="flex gap-2 items-center">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add new checklist item..."
            className="flex-1 text-[13px] h-10 px-4 py-2 rounded-xl"
            disabled={isFrozen}
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 px-4 rounded-xl flex-shrink-0"
            disabled={isFrozen || !newItemText.trim()}
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </form>
      )}
    </div>
  );
};
