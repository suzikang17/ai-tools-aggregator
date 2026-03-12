import React, { useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { Tool } from "../../data/schema";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  tools: Tool[];
  lastUpdated: string | null;
  trendingCount: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Writing: { bg: "#fef3c7", text: "#92400e" },
  "Image Gen": { bg: "#fce7f3", text: "#9d174d" },
  Coding: { bg: "#dbeafe", text: "#1e40af" },
  Audio: { bg: "#d1fae5", text: "#065f46" },
  Video: { bg: "#ede9fe", text: "#5b21b6" },
  Productivity: { bg: "#e0e7ff", text: "#3730a3" },
  Data: { bg: "#ccfbf1", text: "#134e4a" },
  Agents: { bg: "#fee2e2", text: "#991b1b" },
  Marketing: { bg: "#fef9c3", text: "#854d0e" },
  Design: { bg: "#f3e8ff", text: "#6b21a8" },
  Research: { bg: "#e0f2fe", text: "#075985" },
  Other: { bg: "#f1f5f9", text: "#475569" },
};

function isNew(dateAdded: string): boolean {
  const added = new Date(dateAdded);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return added >= sevenDaysAgo;
}

export default function ToolsGrid({ tools, lastUpdated, trendingCount }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(() => {
    const cats = [...new Set(tools.map((t) => t.category))].sort();
    return ["All", ...cats];
  }, [tools]);

  const filteredTools = useMemo(() => {
    if (activeCategory === "All") return tools;
    return tools.filter((t) => t.category === activeCategory);
  }, [tools, activeCategory]);

  const defaultColDef: ColDef = useMemo(() => ({
    resizable: true,
    filter: true,
  }), []);

  const columnDefs: ColDef<Tool>[] = useMemo(() => [
    {
      headerName: "Name",
      field: "name",
      sortable: true,
      cellRenderer: (params: ICellRendererParams<Tool>) => {
        const tool = params.data;
        if (!tool) return null;
        return `<a href="${tool.url}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;font-weight:600">${tool.name}</a>`;
      },
      width: 160,
    },
    {
      headerName: "Category",
      field: "category",
      sortable: true,
      cellRenderer: (params: ICellRendererParams<Tool>) => {
        const cat = params.value as string;
        const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
        return `<span style="background:${colors.bg};color:${colors.text};padding:2px 8px;border-radius:4px;font-size:11px">${cat}</span>`;
      },
      width: 130,
    },
    {
      headerName: "Description",
      field: "description",
      sortable: false,
      filter: false,
      flex: 1,
      minWidth: 200,
      cellStyle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    },
    {
      headerName: "Pricing",
      field: "pricing",
      sortable: true,
      width: 150,
    },
    {
      headerName: "Features",
      field: "features",
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Tool>) => {
        const features = params.value as string[];
        return features ? features.join(", ") : "";
      },
      width: 200,
    },
    {
      headerName: "Updated",
      field: "dateUpdated",
      sortable: true,
      width: 110,
      sort: "desc",
    },
    {
      headerName: "Trend",
      field: "trending",
      sortable: true,
      filter: false,
      width: 80,
      cellRenderer: (params: ICellRendererParams<Tool>) => {
        return params.value ? "🔥" : "";
      },
      cellStyle: { textAlign: "center" },
    },
  ], []);

  const getRowStyle = (params: { data?: Tool }) => {
    if (params.data && isNew(params.data.dateAdded)) {
      return { background: "#fefce8" };
    }
    return undefined;
  };

  return (
    <>
      <div className="stats-bar">
        <span>
          <strong>{tools.length}</strong> tools tracked
        </span>
        {lastUpdated && (
          <span>
            Last updated: <strong>{new Date(lastUpdated).toLocaleDateString()}</strong>
          </span>
        )}
        {trendingCount > 0 && (
          <span>
            🔥 <strong style={{ color: "#dc2626" }}>{trendingCount}</strong> trending today
          </span>
        )}
      </div>

      <div className="category-pills">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ width: "100%", height: "calc(100vh - 240px)" }}>
        <AgGridReact<Tool>
          rowData={filteredTools}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowStyle={getRowStyle}
          domLayout="normal"
          suppressCellFocus={true}
          animateRows={true}
        />
      </div>

      <footer>
        <span>
          Showing {filteredTools.length} of {tools.length} tools
        </span>
        <span>Powered by OpenClaw 🦞</span>
      </footer>
    </>
  );
}
