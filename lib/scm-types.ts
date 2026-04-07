export type ScmAnalysisMode = "live" | "knowledge" | "offline";

export type ScmSource = {
  title: string;
  publication: string;
  date: string;
  keyPoint: string;
  url?: string;
};

export type ScmDashboard = {
  freightCostImpact: string;
  tariffPressure: string;
  disruptionRisk: string;
  costOutlook: string;
};

export type ScmStats = {
  articlesFound: number;
  credibleSources: number;
  disputedClaims: number;
};

export type ScmConfidence = {
  cost: number;
  risk: number;
  challenge: number;
  strategy: number;
  overall: number;
  evidence: number;
};

export type ScmSections = {
  cost: string;
  risk: string;
  check: string;
  strategy: string;
  final: string;
  takeaway: string;
};

export type ScmAnalysisResponse = {
  query: string;
  mode: ScmAnalysisMode;
  dashboard: ScmDashboard;
  stats: ScmStats;
  publications: string[];
  sources: ScmSource[];
  sourceSummary: string;
  notices: string[];
  confidence: ScmConfidence;
  sections: ScmSections;
  footnote: string;
  generatedAt: string;
  quotaResetAt?: string;
  providerModel?: string;
};

export type IntelHeadline = {
  title: string;
  publication: string;
  date: string;
  category: string;
  summary: string;
  url?: string;
};

export type CountryStanding = {
  label: string;
  value: string;
  worldRank: number | null;
  worldTotal: number;
  continentRank: number | null;
  continentTotal: number;
};

export type BargainingFactor = {
  title: string;
  score: number;
  label: string;
  explanation: string;
};

export type CountryIntelResponse = {
  country: {
    name: string;
    code: string;
    capital: string;
    region: string;
    subregion: string;
    continent: string;
    areaKm2: number;
    population: number;
    bordersCount: number;
  };
  confidence: number;
  bargainingPower: {
    score: number;
    label: string;
    summary: string;
  };
  marketPosition: {
    headline: string;
    overview: string;
    continentPosition: string;
    worldPosition: string;
  };
  standings: CountryStanding[];
  bargainingFactors: BargainingFactor[];
  countryInteractions: IntelHeadline[];
  globalInteractions: IntelHeadline[];
  generatedAt: string;
};
