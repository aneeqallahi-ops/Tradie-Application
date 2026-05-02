import React from "react";
import { useGetTaxPrompts } from "@workspace/api-client-react";
import DeductiblePrompt from "@/components/deductible-prompt";
import { Lightbulb, Info } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function PromptsTab() {
  const { data, isLoading, refetch } = useGetTaxPrompts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  const activePrompts = (data?.prompts ?? []).filter(p => !p.dismissed);
  const dismissedPrompts = (data?.prompts ?? []).filter(p => p.dismissed);

  return (
    <div className="space-y-6">
      {/* Trade type not set */}
      {!data?.tradeType && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="font-bold text-amber-400 text-sm">Set your trade type</div>
            <p className="text-sm text-amber-400/80 mt-1.5 leading-relaxed mb-3">
              Set your trade type in Settings to see deduction prompts tailored to your industry.
            </p>
            <Link href="/settings" className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500/20 px-6 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors">
              Go to Settings
            </Link>
          </div>
        </div>
      )}

      {/* Deductible prompts list */}
      {activePrompts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">What you can claim</h3>
          <div className="grid gap-4">
            {activePrompts.map((prompt, i) => (
              <motion.div
                key={prompt.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <DeductiblePrompt
                  promptKey={prompt.key}
                  label={prompt.label}
                  rule={prompt.rule}
                  examples={prompt.examples}
                  onDismiss={() => refetch()}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activePrompts.length === 0 && data?.tradeType && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-3 backdrop-blur-md">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lightbulb className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-white">All prompts reviewed</h3>
          <p className="text-sm text-muted-foreground">Dismissed prompts will re-appear after 30 days to keep you on track.</p>
        </div>
      )}

      {/* Dismissed section */}
      {dismissedPrompts.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
            Dismissed (30 days)
          </h3>
          <div className="grid gap-3">
            {dismissedPrompts.map(prompt => (
              <div key={prompt.key} className="bg-white/5 border border-white/5 rounded-2xl p-5 opacity-50 flex gap-4 items-start grayscale">
                <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-white mb-1">{prompt.label}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{prompt.rule}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
