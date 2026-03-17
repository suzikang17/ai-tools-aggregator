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
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const trendingCount = useMemo(() => tools.filter((t) => t.trending).length, [tools]);

  const categories = useMemo(() => {
    const cats = [...new Set(tools.map((t) => t.category))].sort();
    return ["All", ...cats];
  }, [tools]);

  const filteredTools = useMemo(() => {
    if (activeCategory === "All") return tools;
    return tools.filter((t) => t.category === activeCategory);
  }, [tools, activeCategory]);

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
    return params.data?._isDetail ? 150 : undefined;
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
        buzzScore={tool.buzzScore}
        reviewRating={tool.reviewRating}
        buzzSources={tool.buzzSources}
        ratingSources={tool.ratingSources}
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
      width: 36,
      sortable: false,
      filter: false,
      resizable: false,
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
          <a href={tool.url} target="_blank" rel="noopener noreferrer"
             onClick={(e) => e.stopPropagation()}
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
      cellRenderer: (params: ICellRendererParams<ToolRow>) => {
        if (params.data?._isDetail) return null;
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
      width: 110,
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
      width: 80,
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
