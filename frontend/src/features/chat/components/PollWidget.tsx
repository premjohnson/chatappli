import React, { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useAuthStore } from "../../../store/auth.store";
import type { LiveBlock } from "../types/liveblock.types";

interface PollWidgetProps {
  block: LiveBlock;
  onAction: (type: string, payload?: any) => void;
}

export const PollWidget: React.FC<PollWidgetProps> = ({ block, onAction }) => {
  const [newOptionText, setNewOptionText] = useState("");
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || "";
  const isFrozen = block.isFrozen;

  const options = block.state?.options || [];
  const totalVotes = options.reduce(
    (sum, option) => sum + (option.votes?.length || 0),
    0
  );

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionText.trim() || isFrozen) return;
    onAction("ADD_OPTION", { text: newOptionText.trim() });
    setNewOptionText("");
  };

  return (
    <div className="space-y-4 text-gray-800">
      {/* Options List */}
      <div className="space-y-3">
        {options.map((option) => {
          const votes = option.votes || [];
          const hasVoted = userId ? votes.includes(userId) : false;
          const voteCount = votes.length;
          const percentage =
            totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <div key={option.id} className="relative group">
              {/* Interactive background button */}
              <button
                type="button"
                disabled={isFrozen}
                onClick={() => onAction("VOTE", { optionId: option.id })}
                className={`relative w-full overflow-hidden flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  isFrozen
                    ? "cursor-default border-white/20"
                    : "cursor-pointer active:scale-[0.99] " +
                      (hasVoted
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-white/10 hover:border-white/30 bg-white/5")
                }`}
              >
                {/* Visual vote percentage progress bar fill */}
                <div
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out z-0 ${
                    hasVoted ? "bg-brand-primary/10" : "bg-gray-200/50"
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                {/* Option Content */}
                <div className="relative z-10 flex items-center gap-3 pr-2 select-none">
                  {hasVoted && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary text-white p-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span
                    className={`text-[14px] leading-tight font-semibold break-all ${
                      hasVoted ? "text-brand-primary" : "text-gray-700"
                    }`}
                  >
                    {option.text}
                  </span>
                </div>

                {/* Vote Info */}
                <div className="relative z-10 text-right select-none flex-shrink-0">
                  <span className="text-xs font-bold text-gray-900/60 block">
                    {voteCount} {voteCount === 1 ? "vote" : "votes"}
                  </span>
                  {totalVotes > 0 && (
                    <span className="text-[10px] text-gray-400 font-bold block">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Option Form */}
      {!isFrozen && (
        <form onSubmit={handleAddOption} className="flex gap-2 items-center">
          <Input
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            placeholder="Add a poll option..."
            className="flex-1 text-[13px] h-10 px-4 py-2 rounded-xl"
            disabled={isFrozen}
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 px-4 rounded-xl flex-shrink-0"
            disabled={isFrozen || !newOptionText.trim()}
          >
            <Plus className="w-4 h-4 mr-1" /> Option
          </Button>
        </form>
      )}

      {/* Summary Footer */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none px-1">
        <span>Collaborative Poll</span>
        <span>Total votes: {totalVotes}</span>
      </div>
    </div>
  );
};
