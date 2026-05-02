import React, { useState } from "react";
import { Header, Layout } from "@/components/layout";
import BenchmarksTab from "./benchmarks";
import PromptsTab from "./prompts";
import StrategiesTab from "./strategies";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "strategies" | "benchmarks" | "deductions";

export default function TaxPage() {
  const [tab, setTab] = useState<Tab>("strategies");

  return (
    <Layout>
      <Header title="Tax Intelligence" />
      <div className="px-6 pb-24 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md sticky top-[72px] z-20">
          <button
            onClick={() => setTab("strategies")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              tab === "strategies" 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-muted-foreground hover:text-white/80"
            }`}
          >
            Strategies
          </button>
          <button
            onClick={() => setTab("benchmarks")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              tab === "benchmarks" 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-muted-foreground hover:text-white/80"
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setTab("deductions")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              tab === "deductions" 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-muted-foreground hover:text-white/80"
            }`}
          >
            Deductions
          </button>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "strategies" && <StrategiesTab />}
              {tab === "benchmarks" && <BenchmarksTab />}
              {tab === "deductions" && <PromptsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
