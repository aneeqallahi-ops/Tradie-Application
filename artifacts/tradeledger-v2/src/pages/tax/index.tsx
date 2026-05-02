import React, { useState } from "react";
import { Header, Layout } from "@/components/layout";
import { useGetTaxBenchmarks, useGetTaxPrompts } from "@workspace/api-client-react";
import BenchmarksTab from "./benchmarks";
import PromptsTab from "./prompts";

type Tab = "benchmarks" | "deductions";

export default function TaxPage() {
  const [tab, setTab] = useState<Tab>("benchmarks");

  return (
    <Layout>
      <Header title="Tax Intelligence" />
      <div className="px-5 pb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex bg-secondary rounded-2xl p-1">
          <button
            onClick={() => setTab("benchmarks")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === "benchmarks" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setTab("deductions")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === "deductions" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            Deductions
          </button>
        </div>

        {tab === "benchmarks" ? <BenchmarksTab /> : <PromptsTab />}
      </div>
    </Layout>
  );
}
