import React, { useState } from "react";
import { useDismissPrompt } from "@workspace/api-client-react";
import { ChevronDown, ChevronUp, X, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{label}</div>
          <div className="text-xs text-primary/80 mt-1 line-clamp-2 leading-relaxed">{rule}</div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismiss.isPending}
          className="p-1.5 rounded-full hover:bg-primary/20 text-primary/60 hover:text-primary transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
      <button
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="font-semibold text-white text-sm">{label}</div>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {expanded ? rule : rule.length > 80 ? `${rule.slice(0, 80)}…` : rule}
          </div>
        </div>
        <div className="flex items-center justify-center w-8 h-8 shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Examples</div>
                <div className="flex flex-wrap gap-2">
                  {examples.map(ex => (
                    <span key={ex} className="text-xs bg-white/5 border border-white/10 text-white/80 px-2.5 py-1 rounded-md">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleDismiss}
                disabled={dismiss.isPending}
                className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary font-medium transition-colors bg-primary/10 px-3 py-1.5 rounded-lg w-fit"
              >
                <X className="w-3.5 h-3.5" />
                {dismiss.isPending ? "Dismissing…" : "Dismiss for 30 days"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
