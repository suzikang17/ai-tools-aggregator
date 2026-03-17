import React, { useState, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams, RowClickedEvent, IsFullWidthRowParams, GetRowIdParams } from "ag-grid-community";
import type { Tool } from "../../data/schema";
import { CATEGORY_COLORS } from "./categoryColors";
import DetailRow from "./DetailRow";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  tools: Tool[];
  lastUpdated: string | null;
}

type ToolRow = Tool & { _isDetail?: boolean };

function isNew(dateAdded: string): boolean {
  const added = new Date(dateAdded);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return added >= sevenDaysAgo;
}

export default function ToolsGrid({ tools, lastUpdated }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const trendingCount = useMemo(() => tools.filter((t) => t.trending).length, [tools]);

  const categories = useMemo(() => {
    const cats = [...new Set(tools.map((t) => t.category))].sort();
    return ["All", ...cats];
  }, [tools]);

  const filteredTools = useMemo(() => {
    let filtered = activeCategory === "All" ? tools : tools.filter((t) => t.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.pricing.toLowerCase().includes(q) ||
        t.features.some((f) => f.toLowerCase().includes(q)) ||
        (t.parentPlatform && t.parentPlatform.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [tools, activeCategory, searchQuery]);

  const rowData: ToolRow[] = useMemo(() => {
    const rows: ToolRow[] = [];
    for (const tool of filteredTools) {
      rows.push(tool);
      if (expandedName === tool.name) {
        rows.push({ ...tool, _isDetail: true });
      }
    }
    return rows;
  }, [filteredTools, expandedName]);

  const isFullWidthRow = useCallback((params: IsFullWidthRowParams<ToolRow>) => {
    return params.rowNode.data?._isDetail === true;
  }, []);

  const getRowId = useCallback((params: GetRowIdParams<ToolRow>) => {
    return params.data._isDetail ? `detail-${params.data.name}` : params.data.name;
  }, []);

  const getRowHeight = useCallback((params: { data?: ToolRow }) => {
    return params.data?._isDetail ? 100 : undefined;
  }, []);

  const onRowClicked = useCallback((event: RowClickedEvent<ToolRow>) => {
    const data = event.data;
    if (!data || data._isDetail) return;
    setExpandedName((prev) => prev === data.name ? null : data.name);
  }, []);

  const fullWidthCellRenderer = useCallback((params: ICellRendererParams<ToolRow>) => {
    const tool = params.data;
    if (!tool) return null;
    return (
      <DetailRow
        description={tool.description}
        features={tool.features}
        parentPlatform={tool.parentPlatform}
        logoUrl={tool.logoUrl}
        buzzScore={tool.buzzScore}
        reviewRating={tool.reviewRating}
        buzzSources={tool.buzzSources}
        ratingSources={tool.ratingSources}
        buzzSummary={tool.buzzSummary}
        ratingSummary={tool.ratingSummary}
        toolName={tool.name}
        onCollapse={() => setExpandedName(null)}
      />
    );
  }, []);

  const defaultColDef: ColDef = useMemo(() => ({
    resizable: true,
    filter: true,
  }), []);

  const columnDefs: ColDef<ToolRow>[] = useMemo(() => [
    {
      headerName: "",
      maxWidth: 36,
      sortable: false,
      filter: false,
      resizable: false,
      suppressSizeToFit: true,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (!params.data || params.data._isDetail) return null;
        const isExpanded = expandedName === params.data.name;
        return (
          <span style={{ color: "#94a3b8", fontSize: "10px", cursor: "pointer" }}>
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
        );
      },
    },
    {
      headerName: "Name",
      field: "name",
      sortable: true,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        const tool = params.data;
        if (!tool || tool._isDetail) return null;
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {tool.logoUrl && (
              <img src={tool.logoUrl} alt="" style={{ width: "16px", height: "16px", borderRadius: "3px", objectFit: "contain" }} />
            )}
            <a href={tool.url} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
              {tool.name}
            </a>
          </span>
        );
      },
      minWidth: 140,
      flex: 1,
    },
    {
      headerName: "Category",
      field: "category",
      sortable: true,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
        const cat = params.value as string;
        const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
        return (
          <span style={{ background: colors.bg, color: colors.text, padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
            {cat}
          </span>
        );
      },
      minWidth: 110,
    },
    {
      headerName: "Description",
      field: "description",
      sortable: false,
      filter: false,
      flex: 3,
      minWidth: 250,
      tooltipField: "description",
      cellStyle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    },
    {
      headerName: "Pricing",
      field: "pricing",
      sortable: true,
      minWidth: 100,
    },
    {
      headerName: "Features",
      field: "features",
      sortable: false,
      filter: false,
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
        const features = params.value as string[];
        return features ? features.join(", ") : "";
      },
      tooltipValueGetter: (params) => {
        const features = params.data?.features;
        return features ? features.join(", ") : "";
      },
      cellStyle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    },
    {
      headerName: "Updated",
      field: "dateUpdated",
      sortable: true,
      minWidth: 100,
      sort: "desc",
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
        const val = params.value as string | null;
        if (!val) return <span style={{ color: "#9ca3af" }}>{"\u2014"}</span>;
        return new Date(val).toLocaleDateString();
      },
    },
    {
      headerName: "Buzz",
      field: "buzzScore",
      sortable: true,
      filter: false,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
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
      minWidth: 110,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
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
      minWidth: 60,
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
        return params.value ? "\uD83D\uDD25" : "";
      },
      cellStyle: { textAlign: "center" },
    },
  ], [expandedName]);

  const getRowStyle = useCallback((params: { data?: ToolRow }) => {
    if (params.data && !params.data._isDetail && isNew(params.data.dateAdded)) {
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

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
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
        <AgGridReact<ToolRow>
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          getRowHeight={getRowHeight}
          getRowStyle={getRowStyle}
          isFullWidthRow={isFullWidthRow}
          fullWidthCellRenderer={fullWidthCellRenderer}
          onRowClicked={onRowClicked}
          autoSizeStrategy={{ type: "fitGridWidth" }}
          tooltipShowDelay={300}
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
