import React, { useState } from "react";
import type { BuzzSource, RatingSource } from "../../data/market-pulse-schema";

interface Props {
  description?: string;
  features?: string[];
  parentPlatform?: string;
  buzzScore: number | null;
  reviewRating: number | null;
  buzzSources?: BuzzSource[];
  ratingSources?: RatingSource[];
  lastRefreshed?: string | null;
  toolName: string;
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

export default function DetailRow({ description, features, parentPlatform, buzzScore, reviewRating, buzzSources, ratingSources, lastRefreshed, toolName, onCollapse }: Props) {
  const hasBuzzSources = buzzSources && buzzSources.length > 0;
  const hasRatingSources = ratingSources && ratingSources.length > 0;
  const hasFeatures = features && features.length > 0;
  const [researchStatus, setResearchStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleResearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResearchStatus("sending");
    fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: toolName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        setResearchStatus("sent");
      })
      .catch(() => setResearchStatus("error"));
  };

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
      {/* Description + Features row */}
      {(description || hasFeatures || parentPlatform) && (
        <div style={{ display: "flex", gap: "32px" }}>
          <div style={{ flex: 1, lineHeight: "1.5", color: "#475569" }}>
            {parentPlatform && (
              <span style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                background: "#f0fdf4",
                color: "#166534",
                marginBottom: "4px",
                marginRight: "8px",
              }}>
                {parentPlatform}
              </span>
            )}
            {description}
          </div>
          {hasFeatures && (
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: "4px", color: "#0f172a" }}>Features</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {features.map((f, i) => (
                  <span key={i} style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    background: "#e0e7ff",
                    color: "#3730a3",
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buzz + Rating + Meta row */}
      <div style={{ display: "flex", gap: "32px" }}>
        {/* Buzz breakdown */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", color: "#0f172a" }}>
            Buzz: {buzzScore != null ? `${buzzScore}/100` : "\u2014"}
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
            Rating: {reviewRating != null ? <><Stars rating={reviewRating} /> ({reviewRating})</> : "\u2014"}
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

        {/* Meta + Research button */}
        <div style={{ minWidth: "160px", textAlign: "right", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
          {lastRefreshed && (
            <div style={{ color: "#94a3b8", fontSize: "12px" }}>
              Last refreshed: {new Date(lastRefreshed).toLocaleDateString()}
            </div>
          )}
          <button
            onClick={handleResearch}
            disabled={researchStatus === "sending" || researchStatus === "sent"}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              cursor: researchStatus === "sending" || researchStatus === "sent" ? "default" : "pointer",
              background: researchStatus === "sent" ? "#dcfce7" :
                          researchStatus === "error" ? "#fee2e2" :
                          researchStatus === "sending" ? "#e0e7ff" : "#2563eb",
              color: researchStatus === "sent" ? "#166534" :
                     researchStatus === "error" ? "#991b1b" :
                     researchStatus === "sending" ? "#3730a3" : "#ffffff",
            }}
          >
            {researchStatus === "idle" && "Research"}
            {researchStatus === "sending" && "Sending..."}
            {researchStatus === "sent" && "Sent!"}
            {researchStatus === "error" && "Failed"}
          </button>
          <div style={{ color: "#94a3b8", fontSize: "11px" }}>
            Click to collapse
          </div>
        </div>
      </div>
    </div>
  );
}
