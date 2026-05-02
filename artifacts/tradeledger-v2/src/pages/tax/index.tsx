import React, { useState } from "react";
import { Header, Layout } from "@/components/layout";
import BenchmarksTab from "./benchmarks";
import PromptsTab from "./prompts";
import StrategiesTab from "./strategies";

type Tab = "strategies" | "benchmarks" | "deductions";

export default function TaxPage() {
  const [tab, setTab] = useState<Tab>("strategies");

  return (
    <Layout>
      <Header title="Tax Intelligence" />
      <div className="px-5 pb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex bg-secondary rounded-2xl p-1 gap-0.5">
          <button
            onClick={() => setTab("strategies")}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === "strategies" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            Strategies
          </button>
          <button
            onClick={() => setTab("benchmarks")}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === "benchmarks" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setTab("deductions")}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === "deductions" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            Deductions
          </button>
        </div>

        {tab === "strategies" && <StrategiesTab />}
        {tab === "benchmarks" && <BenchmarksTab />}
        {tab === "deductions" && <PromptsTab />}
      </div>
    </Layout>
  );
}
