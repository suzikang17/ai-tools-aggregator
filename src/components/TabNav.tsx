import React from "react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "discovery", label: "Discovery" },
  { id: "market-pulse", label: "Market Pulse" },
];

export default function TabNav({ activeTab, onTabChange }: Props) {
  return (
    <div className="tab-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
