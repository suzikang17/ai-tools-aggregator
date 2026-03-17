import React from "react";
import type { BuzzSource, RatingSource } from "../../data/market-pulse-schema";

interface Props {
  description?: string;
  buzzScore: number | null;
  reviewRating: number | null;
  buzzSources?: BuzzSource[];
  ratingSources?: RatingSource[];
  lastRefreshed?: string | null;
  onCollapse: () => void;
}

function Stars({ rating }: { rating: number }) {
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
  return <span style={{ fontSize: "13px", letterSpacing: "1px" }}>{stars}</span>;
}

export default function DetailRow({ description, buzzScore, reviewRating, buzzSources, ratingSources, lastRefreshed, onCollapse }: Props) {
  const hasBuzzSources = buzzSources && buzzSources.length > 0;
  const hasRatingSources = ratingSources && ratingSources.length > 0;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "16px 24px",
      background: "#f8fafc",
      borderBottom: "1px solid #e2e8f0",
      fontSize: "13px",
      color: "#334155",
      cursor: "pointer",
    }} onClick={onCollapse}>
      {description && (
        <div style={{ lineHeight: "1.5", color: "#475569" }}>
          {description}
        </div>
      )}
      <div style={{ display: "flex", gap: "32px" }}>
      {/* Buzz breakdown */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: "8px", color: "#0f172a" }}>
          Buzz: {buzzScore != null ? `${buzzScore}/100` : "—"}
        </div>
        {hasBuzzSources ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {buzzSources.map((src, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", maxWidth: "320px" }}>
                <span style={{ color: "#64748b" }}>{src.platform}</span>
                <span>
                  {src.mentions != null && <span style={{ fontWeight: 500 }}>{src.mentions} mentions</span>}
                  {src.detail && <span style={{ fontWeight: 500 }}>{src.detail}</span>}
                  {src.sentiment && (
                    <span style={{
                      marginLeft: "8px",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      background: src.sentiment === "positive" ? "#dcfce7" :
                                  src.sentiment === "negative" ? "#fee2e2" :
                                  src.sentiment === "mixed" ? "#fef9c3" : "#f1f5f9",
                      color: src.sentiment === "positive" ? "#166534" :
                             src.sentiment === "negative" ? "#991b1b" :
                             src.sentiment === "mixed" ? "#854d0e" : "#475569",
                    }}>
                      {src.sentiment}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No source data yet</div>
        )}
      </div>

      {/* Rating breakdown */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: "8px", color: "#0f172a" }}>
          Rating: {reviewRating != null ? <><Stars rating={reviewRating} /> ({reviewRating})</> : "—"}
        </div>
        {hasRatingSources ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {ratingSources.map((src, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", maxWidth: "320px" }}>
                <span style={{ color: "#64748b" }}>{src.platform}</span>
                <span>
                  <Stars rating={src.rating} />
                  <span style={{ fontWeight: 500, marginLeft: "6px" }}>{src.rating}</span>
                  {src.reviewCount != null && (
                    <span style={{ color: "#94a3b8", marginLeft: "6px" }}>({src.reviewCount} reviews)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No review data yet</div>
        )}
      </div>

      {/* Meta */}
      <div style={{ minWidth: "140px", textAlign: "right" }}>
        {lastRefreshed && (
          <div style={{ color: "#94a3b8", fontSize: "12px" }}>
            Last refreshed: {new Date(lastRefreshed).toLocaleDateString()}
          </div>
        )}
        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>
          Click to collapse
        </div>
      </div>
      </div>
    </div>
  );
}
