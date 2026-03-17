import React, { useState, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { Tool } from "../../data/schema";
import { CATEGORY_COLORS } from "./categoryColors";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  tools: Tool[];
  lastUpdated: string | null;
}

function isNew(dateAdded: string): boolean {
  const added = new Date(dateAdded);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return added >= sevenDaysAgo;
}

export default function ToolsGrid({ tools, lastUpdated }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");

  const trendingCount = useMemo(() => tools.filter((t) => t.trending).length, [tools]);

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
        return (
          <a href={tool.url} target="_blank" rel="noopener noreferrer"
             style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            {tool.name}
          </a>
        );
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
        return (
          <span style={{ background: colors.bg, color: colors.text, padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
            {cat}
          </span>
        );
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
      headerName: "Buzz",
      field: "buzzScore",
      sortable: true,
      filter: false,
      width: 100,
      cellRenderer: (params: ICellRendererParams<Tool>) => {
        const score = params.value as number | null;
        if (score == null) return <span style={{ color: "#9ca3af" }}>—</span>;
        const color = score >= 70 ? "#16a34a" : score >= 40 ? "#ca8a04" : "#dc2626";
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              width: "40px", height: "6px", borderRadius: "3px", background: "#e5e7eb",
              display: "inline-block", position: "relative", overflow: "hidden",
            }}>
              <span style={{
                width: `${score}%`, height: "100%", borderRadius: "3px",
                background: color, position: "absolute", left: 0, top: 0,
              }} />
            </span>
            <span style={{ color, fontWeight: 600, fontSize: "12px" }}>{score}</span>
          </span>
        );
      },
    },
    {
      headerName: "Rating",
      field: "reviewRating",
      sortable: true,
      filter: false,
      width: 110,
      cellRenderer: (params: ICellRendererParams<Tool>) => {
        const rating = params.value as number | null;
        if (rating == null) return <span style={{ color: "#9ca3af" }}>—</span>;
        const stars: React.ReactNode[] = [];
        for (let i = 1; i <= 5; i++) {
          if (rating >= i) {
            stars.push(<span key={i} style={{ color: "#f59e0b" }}>&#9733;</span>);
          } else if (rating >= i - 0.5) {
            stars.push(<span key={i} style={{ color: "#f59e0b", opacity: 0.5 }}>&#9733;</span>);
          } else {
            stars.push(<span key={i} style={{ color: "#d1d5db" }}>&#9733;</span>);
          }
        }
        return <span style={{ fontSize: "14px", letterSpacing: "1px" }}>{stars}</span>;
      },
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

  const getRowStyle = useCallback((params: { data?: Tool }) => {
    if (params.data && isNew(params.data.dateAdded)) {
      return { background: "#fefce8" };
    }
    return undefined;
  }, []);

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
