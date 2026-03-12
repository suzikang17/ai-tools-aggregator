export interface Tool {
  name: string;
  url: string;
  category: string;
  description: string;
  features: string[];
  pricing: string;
  dateAdded: string;
  dateUpdated: string;
  trending: boolean;
  sourceUrls: string[];
}

export interface ToolsData {
  metadata: {
    lastUpdated: string | null;
    totalTools: number;
    trendingCount: number;
  };
  tools: Tool[];
}

export interface Source {
  url: string;
  name: string;
  type: "seed" | "discovered";
  lastChecked: string | null;
  toolsFound: number;
  timesChecked: number;
  qualityScore: number;
}

export interface SourcesData {
  sources: Source[];
}
