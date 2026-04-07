import { buildFallbackAnalysis } from "@/lib/scm-fallback";
import { ScmAnalysisResponse, ScmSource } from "@/lib/scm-types";

const GOOGLE_NEWS_BASE = "https://news.google.com/rss/search";

function stripCdata(value: string): string {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function extractTag(item: string, tagName: string): string {
  const match = item.match(new RegExp(`<${tagName}(?: [^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? decodeXml(stripCdata(match[1])) : "";
}

function formatDate(rawValue: string): string {
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function summarizeHeadline(title: string): string {
  const normalized = title.replace(/\s+-\s+[^-]+$/, "").trim();

  if (!normalized) {
    return "Recent coverage highlights an active development relevant to this query.";
  }

  return `${normalized}.`;
}

function citation(source: ScmSource | undefined): string {
  if (!source) {
    return "";
  }

  return `[${source.title}, ${source.publication}, ${source.date}]`;
}

function buildSourceSummary(query: string, sources: ScmSource[]): string {
  if (sources.length === 0) {
    return `Public news search returned no live articles for "${query}", so the answer uses deterministic SCM reasoning only.`;
  }

  const publications = Array.from(new Set(sources.map((source) => source.publication))).slice(0, 4);
  return `Live coverage for "${query}" is drawing from ${publications.join(", ")}. The reporting cluster suggests the topic is active, but headlines should still be translated into lane-level cost and sourcing impact before making decisions.`;
}

function buildLeadParagraph(label: string, sources: ScmSource[]): string {
  const related = sources.slice(0, 2).map(citation).filter(Boolean).join(" ");

  switch (label) {
    case "risk":
      return related
        ? `Recent live coverage keeps the focus on active disruption signals and operational uncertainty rather than a single static cost figure. ${related}`
        : "";
    case "check":
      return related
        ? `The current headlines are useful directional evidence, but they are not the same thing as contract freight invoices or full landed-cost models. ${related}`
        : "";
    case "final":
      return related
        ? `Recent reporting supports the broad operating picture, even if the exact cost pass-through still varies by lane, supplier mix, and contract structure. ${related}`
        : "";
    default:
      return related
        ? `Recent live reporting points to the cost drivers that matter most in this topic right now. ${related}`
        : "";
  }
}

export async function fetchGoogleNewsSources(query: string): Promise<ScmSource[]> {
  const url = new URL(GOOGLE_NEWS_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const response = await fetch(url.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0 SCM-Analyst/1.0"
    },
    next: {
      revalidate: 900
    }
  });

  if (!response.ok) {
    throw new Error(`Public news search failed with status ${response.status}.`);
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => match[1])
    .slice(0, 6);

  const mappedSources: Array<ScmSource | null> = items
    .map((item) => {
      const title = extractTag(item, "title").replace(/\s+-\s+[^-]+$/, "").trim();
      const publication = extractTag(item, "source") || "Google News";
      const date = formatDate(extractTag(item, "pubDate"));
      const url = extractTag(item, "link");

      if (!title || !publication || !date) {
        return null;
      }

      return {
        title,
        publication,
        date,
        keyPoint: summarizeHeadline(title),
        url: url || undefined
      } satisfies ScmSource;
    });

  return mappedSources.filter((source): source is ScmSource => source !== null);
}

export async function buildPublicResearchAnalysis(query: string): Promise<ScmAnalysisResponse> {
  const sources = await fetchGoogleNewsSources(query);
  const base = buildFallbackAnalysis(query, {
    mode: sources.length > 0 ? "live" : "offline",
    footnote:
      sources.length > 0
        ? "Live research mode powered by public news feeds and deterministic SCM synthesis."
        : "No live articles were available, so the app used deterministic SCM synthesis."
  });

  const costLead = buildLeadParagraph("cost", sources);
  const riskLead = buildLeadParagraph("risk", sources);
  const checkLead = buildLeadParagraph("check", sources);
  const finalLead = buildLeadParagraph("final", sources);

  const publications = Array.from(new Set(sources.map((source) => source.publication))).slice(0, 6);
  const evidenceBoost = Math.min(sources.length * 3, 12);

  return {
    ...base,
    mode: sources.length > 0 ? "live" : "offline",
    publications,
    sources,
    stats: {
      articlesFound: sources.length,
      credibleSources: publications.length,
      disputedClaims: Math.max(base.stats.disputedClaims, 1)
    },
    sourceSummary: buildSourceSummary(query, sources),
    notices: [],
    confidence: {
      ...base.confidence,
      evidence: Math.min(base.confidence.evidence + evidenceBoost, 78),
      overall: Math.min(base.confidence.overall + Math.floor(evidenceBoost / 2), 80)
    },
    sections: {
      ...base.sections,
      cost: costLead ? `${costLead}\n\n${base.sections.cost}` : base.sections.cost,
      risk: riskLead ? `${riskLead}\n\n${base.sections.risk}` : base.sections.risk,
      check: checkLead ? `${checkLead}\n\n${base.sections.check}` : base.sections.check,
      final: finalLead
        ? base.sections.final.replace("**After full analysis:**", `**After full analysis:** ${finalLead}`)
        : base.sections.final
    },
    providerModel: sources.length > 0 ? "public-news-synthesis" : "local-fallback",
    generatedAt: new Date().toISOString()
  };
}
