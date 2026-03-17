import React, { useState, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { TrackedTool } from "../../data/market-pulse-schema";
import { CATEGORY_COLORS } from "./categoryColors";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  tools: TrackedTool[];
  lastRefreshed: string | null;
}

const RANK_COLORS: Record<number, string> = {
  1: "#f59e0b", // gold
  2: "#94a3b8", // silver
  3: "#cd7f32", // bronze
};

function getScoreDelta(tool: TrackedTool): number | null {
  if (tool.history.length < 2) return null;
  const lastWeek = tool.history[tool.history.length - 2];
  if (lastWeek.popularityScore == null || tool.popularityScore == null) return null;
  return tool.popularityScore - lastWeek.popularityScore;
}

export default function MarketPulseGrid({ tools, lastRefreshed }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"ranked" | "movers">("ranked");

  const upCount = useMemo(() => tools.filter((t) => t.sentimentTrend === "up").length, [tools]);
  const downCount = useMemo(() => tools.filter((t) => t.sentimentTrend === "down").length, [tools]);

  const categories = useMemo(() => {
    const cats = [...new Set(tools.map((t) => t.category))].sort();
    return ["All", ...cats];
  }, [tools]);

  const filteredTools = useMemo(() => {
    let filtered = activeCategory === "All" ? [...tools] : tools.filter((t) => t.category === activeCategory);

    if (viewMode === "movers") {
      const withDelta = filtered.map((t) => ({ tool: t, delta: getScoreDelta(t) }));
      withDelta.sort((a, b) => {
        if (a.delta == null && b.delta == null) return 0;
        if (a.delta == null) return 1;
        if (b.delta == null) return -1;
        return Math.abs(b.delta) - Math.abs(a.delta);
      });
      filtered = withDelta.map((w) => w.tool);
    } else {
      // Top Ranked: sort by rank ascending, unranked last
      filtered.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
    }

    return filtered;
  }, [tools, activeCategory, viewMode]);

  const defaultColDef: ColDef = useMemo(() => ({
    resizable: true,
    filter: true,
  }), []);

  const columnDefs: ColDef<TrackedTool>[] = useMemo(() => [
    {
      headerName: "#",
      width: 60,
      sortable: true,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
        const tool = params.data;
        if (!tool) return null;

        if (viewMode === "movers") {
          const delta = getScoreDelta(tool);
          if (delta == null) return <span style={{ color: "#2563eb", fontWeight: 700, fontSize: "11px" }}>NEW</span>;
          const color = delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#94a3b8";
          const prefix = delta > 0 ? "+" : "";
          return <span style={{ color, fontWeight: 700 }}>{prefix}{delta}</span>;
        }

        const rank = tool.rank;
        if (rank == null) return <span style={{ color: "#94a3b8" }}>—</span>;
        const color = RANK_COLORS[rank] || "#64748b";
        return <span style={{ color, fontWeight: 700 }}>{rank}</span>;
      },
      valueGetter: (params) => {
        if (viewMode === "movers") {
          const delta = params.data ? getScoreDelta(params.data) : null;
          return delta != null ? Math.abs(delta) : -1;
        }
        return params.data?.rank ?? 9999;
      },
    },
    {
      headerName: "Name",
      field: "name",
      sortable: true,
      width: 160,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
        const tool = params.data;
        if (!tool) return null;
        return (
          <a href={tool.url} target="_blank" rel="noopener noreferrer"
             style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            {tool.name}
          </a>
        );
      },
    },
    {
      headerName: "Category",
      field: "category",
      sortable: true,
      width: 130,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
        const cat = params.value as string;
        const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
        return (
          <span style={{ background: colors.bg, color: colors.text, padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
            {cat}
          </span>
        );
      },
    },
    {
      headerName: "Buzz",
      field: "buzzScore",
      sortable: true,
      width: 100,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
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
      width: 110,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
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
      headerName: "Score",
      field: "popularityScore",
      sortable: true,
      width: 80,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
        const score = params.value as number | null;
        if (score == null) return <span style={{ color: "#9ca3af" }}>—</span>;
        return <span style={{ fontWeight: 700 }}>{score}</span>;
      },
    },
    {
      headerName: "Trend",
      field: "sentimentTrend",
      sortable: true,
      width: 70,
      cellRenderer: (params: ICellRendererParams<TrackedTool>) => {
        const trend = params.value as string | null;
        if (trend === "up") return <span style={{ color: "#16a34a", fontWeight: 700 }}>&#9650;</span>;
        if (trend === "down") return <span style={{ color: "#dc2626", fontWeight: 700 }}>&#9660;</span>;
        return <span style={{ color: "#94a3b8" }}>—</span>;
      },
      cellStyle: { textAlign: "center" },
    },
  ], [viewMode]);

  return (
    <>
      <div className="stats-bar">
        <span>
          <strong>{tools.length}</strong> tools tracked
        </span>
        {lastRefreshed && (
          <span>
            Last refreshed: <strong>{new Date(lastRefreshed).toLocaleDateString()}</strong>
          </span>
        )}
        {(upCount > 0 || downCount > 0) && (
          <span>
            {upCount > 0 && <span style={{ color: "#16a34a" }}>&#9650; {upCount}</span>}
            {upCount > 0 && downCount > 0 && " "}
            {downCount > 0 && <span style={{ color: "#dc2626" }}>&#9660; {downCount}</span>}
            {" "}this week
          </span>
        )}
      </div>

      <div className="view-toggle">
        <button
          className={`view-pill ${viewMode === "ranked" ? "active" : ""}`}
          onClick={() => setViewMode("ranked")}
        >
          Top Ranked
        </button>
        <button
          className={`view-pill ${viewMode === "movers" ? "active" : ""}`}
          onClick={() => setViewMode("movers")}
        >
          Biggest Movers
        </button>
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

      <div style={{ width: "100%", height: "calc(100vh - 300px)" }}>
        <AgGridReact<TrackedTool>
          rowData={filteredTools}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
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
