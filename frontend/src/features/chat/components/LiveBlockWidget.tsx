import React from "react";
import { ListTodo, BarChart3, Lock, ShieldAlert } from "lucide-react";
import { Spinner } from "../../../components/ui/Spinner";
import { Button } from "../../../components/ui/Button";
import { useLiveBlock } from "../hooks/useLiveBlock";
import { emitLiveBlockAction } from "../../../lib/socket";
import { ChecklistWidget } from "./ChecklistWidget";
import { PollWidget } from "./PollWidget";

interface LiveBlockWidgetProps {
  blockId: string;
}

export const LiveBlockWidget: React.FC<LiveBlockWidgetProps> = ({
  blockId,
}) => {
  const { data: block, isLoading, error } = useLiveBlock(blockId);

  const handleAction = (type: string, payload?: any) => {
    if (!block || block.isFrozen) return;

    emitLiveBlockAction({
      blockId,
      clientVersion: block.version,
      action: {
        type,
        payload,
      },
    });
  };

  const handleFreeze = () => {
    if (!block || block.isFrozen) return;
    if (window.confirm("Are you sure you want to freeze this widget? This action cannot be undone.")) {
      handleAction("FREEZE");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white/10 rounded-2xl border border-white/20 min-h-[120px] w-72 md:w-80">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl w-72 md:w-80">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <span className="text-xs font-semibold">Failed to load collaborative widget.</span>
      </div>
    );
  }

  const isChecklist = block.type === "checklist";
  const Icon = isChecklist ? ListTodo : BarChart3;

  return (
    <div className="w-72 md:w-80 p-4 rounded-2xl bg-white/40 border border-white/30 shadow-lg backdrop-blur-md transition-all select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-950/5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary">
            <Icon className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {block.type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {block.isFrozen ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <Lock className="w-3 h-3" /> Frozen
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFreeze}
              className="text-[10px] h-7 px-2.5 rounded-full border-gray-300 text-gray-500 hover:text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-wider"
              title="Freeze State"
            >
              Freeze
            </Button>
          )}
        </div>
      </div>

      {/* Body Widget */}
      {isChecklist ? (
        <ChecklistWidget block={block} onAction={handleAction} />
      ) : (
        <PollWidget block={block} onAction={handleAction} />
      )}
    </div>
  );
};
