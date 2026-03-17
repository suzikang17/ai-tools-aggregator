import React, { useState } from "react";
import type { BuzzSource, RatingSource } from "../../data/market-pulse-schema";

interface Props {
  description?: string;
  features?: string[];
  parentPlatform?: string;
  logoUrl?: string;
  buzzScore: number | null;
  reviewRating: number | null;
  buzzSources?: BuzzSource[];
  ratingSources?: RatingSource[];
  buzzSummary?: string;
  ratingSummary?: string;
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
  return <span style={{ fontSize: "12px", letterSpacing: "1px" }}>{stars}</span>;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const bg = sentiment === "positive" ? "#dcfce7" :
             sentiment === "negative" ? "#fee2e2" :
             sentiment === "mixed" ? "#fef9c3" : "#f1f5f9";
  const color = sentiment === "positive" ? "#166534" :
                sentiment === "negative" ? "#991b1b" :
                sentiment === "mixed" ? "#854d0e" : "#475569";
  return (
    <span style={{ padding: "1px 5px", borderRadius: "3px", fontSize: "10px", background: bg, color }}>{sentiment}</span>
  );
}

export default function DetailRow({ description, features, parentPlatform, logoUrl, buzzScore, reviewRating, buzzSources, ratingSources, buzzSummary, ratingSummary, lastRefreshed, toolName, onCollapse }: Props) {
  const hasBuzzSources = buzzSources && buzzSources.length > 0;
  const hasRatingSources = ratingSources && ratingSources.length > 0;
  const [researchStatus, setResearchStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleResearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResearchStatus("sending");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = (import.meta as any).env?.PUBLIC_RESEARCH_API_KEY;
    if (apiKey) headers["x-api-key"] = apiKey;
    fetch("/api/research", {
      method: "POST",
      headers,
      body: JSON.stringify({ tool: toolName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        setResearchStatus("sent");
      })
      .catch(() => setResearchStatus("error"));
  };

  return (
    <div
      style={{
        padding: "12px 20px",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        fontSize: "12px",
        color: "#334155",
        cursor: "pointer",
        display: "flex",
        gap: "24px",
        alignItems: "flex-start",
      }}
      onClick={onCollapse}
    >
      {/* Left: Buzz detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
          Buzz {buzzScore != null ? `${buzzScore}/100` : ""}
        </div>
        {buzzSummary && (
          <div style={{ color: "#475569", lineHeight: "1.4", marginBottom: "4px" }}>{buzzSummary}</div>
        )}
        {hasBuzzSources ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {buzzSources.map((src, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#64748b" }}>
                <span style={{ fontWeight: 500, color: "#334155" }}>{src.platform}</span>
                {src.mentions != null && <span>{src.mentions}</span>}
                {src.detail && <span>{src.detail}</span>}
                {src.sentiment && <SentimentBadge sentiment={src.sentiment} />}
                {i < buzzSources.length - 1 && <span style={{ color: "#d1d5db" }}>|</span>}
              </span>
            ))}
          </div>
        ) : !buzzSummary && (
          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No buzz data yet</span>
        )}
      </div>

      {/* Middle: Rating detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
          Rating {reviewRating != null && <><Stars rating={reviewRating} /> ({reviewRating})</>}
        </div>
        {ratingSummary && (
          <div style={{ color: "#475569", lineHeight: "1.4", marginBottom: "4px" }}>{ratingSummary}</div>
        )}
        {hasRatingSources ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {ratingSources.map((src, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#64748b" }}>
                <span style={{ fontWeight: 500, color: "#334155" }}>{src.platform}</span>
                <Stars rating={src.rating} />
                <span>{src.rating}</span>
                {src.reviewCount != null && <span>({src.reviewCount})</span>}
                {i < ratingSources.length - 1 && <span style={{ color: "#d1d5db" }}>|</span>}
              </span>
            ))}
          </div>
        ) : !ratingSummary && (
          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No review data yet</span>
        )}
      </div>

      {/* Right: Meta + actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
        {parentPlatform && (
          <span style={{
            padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600,
            background: "#f0fdf4", color: "#166534",
          }}>
            {parentPlatform}
          </span>
        )}
        {lastRefreshed && (
          <span style={{ color: "#94a3b8", fontSize: "11px" }}>
            {new Date(lastRefreshed).toLocaleDateString()}
          </span>
        )}
        <button
          onClick={handleResearch}
          disabled={researchStatus === "sending" || researchStatus === "sent"}
          style={{
            padding: "4px 12px",
            borderRadius: "5px",
            fontSize: "11px",
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
      </div>
    </div>
  );
}
