import React from "react";
import { Header } from "./components/Header";
import { ComponentTable } from "./components/ComponentTable";
import { TokenPanel } from "./components/TokenPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { useScan } from "./hooks/useScan";
import { useProgress } from "./hooks/useProgress";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  useScan();
  useProgress();
  useTheme();

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <ComponentTable />
        <TokenPanel />
      </div>
      <TerminalPanel />
    </div>
  );
}
