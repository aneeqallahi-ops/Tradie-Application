import React from "react";
import { useGetTaxPrompts } from "@workspace/api-client-react";
import DeductiblePrompt from "@/components/deductible-prompt";
import { Lightbulb } from "lucide-react";
import { Link } from "wouter";

export default function PromptsTab() {
  const { data, isLoading, refetch } = useGetTaxPrompts();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  const activePrompts = (data?.prompts ?? []).filter(p => !p.dismissed);

  return (
    <div className="space-y-5">
      {/* Trade type not set */}
      {!data?.tradeType && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-bold text-amber-900 text-sm">Set your trade type</div>
            <p className="text-xs text-amber-800 mt-1">
              Set your trade type in Settings to see prompts tailored to your industry.
            </p>
            <Link href="/settings" className="text-xs font-semibold text-amber-900 underline mt-1 inline-block">
              Go to Settings →
            </Link>
          </div>
        </div>
      )}

      {/* Deductible prompts list */}
      {activePrompts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">What you can claim</h3>
          {activePrompts.map(prompt => (
            <DeductiblePrompt
              key={prompt.key}
              promptKey={prompt.key}
              label={prompt.label}
              rule={prompt.rule}
              examples={prompt.examples}
              onDismiss={() => refetch()}
            />
          ))}
        </div>
      )}

      {activePrompts.length === 0 && data?.tradeType && (
        <div className="bg-secondary rounded-2xl p-5 text-center space-y-2">
          <Lightbulb className="w-8 h-8 text-primary mx-auto" />
          <p className="font-semibold text-primary">All prompts reviewed!</p>
          <p className="text-xs text-gray-500">Dismissed prompts will re-appear after 30 days.</p>
        </div>
      )}

      {/* Dismissed section */}
      {(data?.prompts ?? []).filter(p => p.dismissed).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dismissed (30 days)</h3>
          {(data?.prompts ?? [])
            .filter(p => p.dismissed)
            .map(prompt => (
              <div key={prompt.key} className="bg-gray-50 rounded-2xl p-4 opacity-60">
                <div className="font-semibold text-sm text-gray-600">{prompt.label}</div>
                <div className="text-xs text-gray-400 mt-1">{prompt.rule}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
