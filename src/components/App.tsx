import React, { useState, useEffect } from "react";
import TabNav from "./TabNav";
import ToolsGrid from "./ToolsGrid";
import MarketPulseGrid from "./MarketPulseGrid";
import type { Tool } from "../../data/schema";
import type { TrackedTool } from "../../data/market-pulse-schema";

interface Props {
  tools: Tool[];
  toolsLastUpdated: string | null;
  pulseTools: TrackedTool[];
  pulseLastRefreshed: string | null;
}

function getInitialTab(): string {
  if (typeof window !== "undefined") {
    const hash = window.location.hash.replace("#", "");
    if (hash === "market-pulse") return "market-pulse";
  }
  return "discovery";
}

export default function App({ tools, toolsLastUpdated, pulseTools, pulseLastRefreshed }: Props) {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "market-pulse" || hash === "discovery") {
        setActiveTab(hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "discovery" ? (
        <ToolsGrid tools={tools} lastUpdated={toolsLastUpdated} />
      ) : (
        <MarketPulseGrid tools={pulseTools} lastRefreshed={pulseLastRefreshed} />
      )}
    </>
  );
}
