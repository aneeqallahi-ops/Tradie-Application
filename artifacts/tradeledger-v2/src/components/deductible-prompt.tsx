import React, { useState } from "react";
import { useDismissPrompt } from "@workspace/api-client-react";
import { ChevronDown, ChevronUp, X, Lightbulb } from "lucide-react";

interface DeductiblePromptProps {
  promptKey: string;
  label: string;
  rule: string;
  examples: string[];
  onDismiss?: () => void;
  compact?: boolean;
}

export default function DeductiblePrompt({
  promptKey,
  label,
  rule,
  examples,
  onDismiss,
  compact = false,
}: DeductiblePromptProps) {
  const [expanded, setExpanded] = useState(false);
  const dismiss = useDismissPrompt();

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismiss.mutate(
      { promptKey },
      { onSuccess: () => onDismiss?.() }
    );
  };

  if (compact) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-3">
        <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-blue-900 text-sm">{label}</div>
          <div className="text-xs text-blue-700 mt-0.5 line-clamp-2">{rule}</div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismiss.isPending}
          className="p-1 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
      <button
        className="w-full p-4 flex items-start gap-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-blue-900 text-sm">{label}</div>
          <div className="text-xs text-blue-700 mt-0.5 leading-relaxed">
            {expanded ? rule : rule.length > 80 ? `${rule.slice(0, 80)}…` : rule}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-blue-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-blue-100 pt-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Examples</div>
            <div className="flex flex-wrap gap-1.5">
              {examples.map(ex => (
                <span key={ex} className="text-xs bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  {ex}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={dismiss.isPending}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {dismiss.isPending ? "Dismissing…" : "Dismiss for 30 days"}
          </button>
        </div>
      )}
    </div>
  );
}
