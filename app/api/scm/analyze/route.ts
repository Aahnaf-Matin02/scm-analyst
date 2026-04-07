import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildFallbackAnalysis } from "@/lib/scm-fallback";
import { buildPublicResearchAnalysis } from "@/lib/scm-public-research";
import { ScmAnalysisResponse } from "@/lib/scm-types";

export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";

const RequestSchema = z.object({
  query: z.string().trim().min(3).max(280)
});

const SourceSchema = z.object({
  title: z.string().trim().min(1),
  publication: z.string().trim().min(1),
  date: z.string().trim().min(1),
  keyPoint: z.string().trim().min(1),
  url: z.string().trim().url().optional()
});

const AnalysisSchema = z.object({
  mode: z.enum(["live", "knowledge", "offline"]).optional(),
  dashboard: z.object({
    freightCostImpact: z.string().trim().min(1),
    tariffPressure: z.string().trim().min(1),
    disruptionRisk: z.string().trim().min(1),
    costOutlook: z.string().trim().min(1)
  }),
  stats: z.object({
    articlesFound: z.coerce.number().int().nonnegative(),
    credibleSources: z.coerce.number().int().nonnegative(),
    disputedClaims: z.coerce.number().int().nonnegative()
  }),
  publications: z.array(z.string().trim().min(1)).default([]),
  sources: z.array(SourceSchema).default([]),
  sourceSummary: z.string().trim().default(""),
  notices: z.array(z.string().trim().min(1)).default([]),
  confidence: z.object({
    cost: z.coerce.number().int().min(0).max(100),
    risk: z.coerce.number().int().min(0).max(100),
    challenge: z.coerce.number().int().min(0).max(100),
    strategy: z.coerce.number().int().min(0).max(100),
    overall: z.coerce.number().int().min(0).max(100),
    evidence: z.coerce.number().int().min(0).max(100)
  }),
  sections: z.object({
    cost: z.string().trim().min(1),
    risk: z.string().trim().min(1),
    check: z.string().trim().min(1),
    strategy: z.string().trim().min(1),
    final: z.string().trim().min(1),
    takeaway: z.string().trim().min(1)
  }),
  footnote: z.string().trim().default("")
});

type AnthropicContentBlock = {
  type?: string;
  text?: string;
  content?: unknown;
};

type AnthropicResponse = {
  content?: AnthropicContentBlock[];
  model?: string;
};

class AnthropicRequestError extends Error {
  status: number;
  quotaResetAt?: string;
  isLimitError: boolean;

  constructor(message: string, status: number, quotaResetAt?: string, isLimitError = false) {
    super(message);
    this.name = "AnthropicRequestError";
    this.status = status;
    this.quotaResetAt = quotaResetAt;
    this.isLimitError = isLimitError;
  }
}

function systemPrompt({ withSearch }: { withSearch: boolean }): string {
  const sourcingRules = withSearch
    ? "Use live web search when it materially improves accuracy. Cite only sources you actually found. If live search fails or returns no dependable evidence, set mode to \"knowledge\", set publications and sources to empty arrays, and do not fabricate article titles, outlets, or dates."
    : "Do not claim to have searched the web. Do not fabricate article titles, publishers, dates, or citations. Set mode to \"knowledge\", and keep publications and sources empty arrays.";

  return `You are a senior supply chain intelligence analyst.

${sourcingRules}

Return only valid JSON, with no markdown fences and no commentary before or after the JSON.

Schema:
{
  "mode": "live" | "knowledge" | "offline",
  "dashboard": {
    "freightCostImpact": "short label",
    "tariffPressure": "short label",
    "disruptionRisk": "short label",
    "costOutlook": "short label"
  },
  "stats": {
    "articlesFound": 0,
    "credibleSources": 0,
    "disputedClaims": 0
  },
  "publications": ["Source A", "Source B"],
  "sources": [
    {
      "title": "headline",
      "publication": "publisher",
      "date": "Month Year",
      "keyPoint": "single sentence",
      "url": "https://example.com/article"
    }
  ],
  "sourceSummary": "1-2 sentence evidence summary",
  "notices": ["optional operational note"],
  "confidence": {
    "cost": 0,
    "risk": 0,
    "challenge": 0,
    "strategy": 0,
    "overall": 0,
    "evidence": 0
  },
  "sections": {
    "cost": "markdown with headings and a 4-row markdown table ending with Data confidence: XX%",
    "risk": "markdown ending with Risk confidence: XX%",
    "check": "2-3 paragraphs ending with Challenge severity: XX%",
    "strategy": "markdown with headings and numbered actions",
    "final": "starts with **After full analysis:** and ends with Overall confidence: XX%",
    "takeaway": "2-3 sentence manager takeaway"
  },
  "footnote": "short footer note"
}

Rules:
- Keep the answer practical, precise, and under 1,500 total words.
- If mode is "live", include 4 to 6 sources and keep publications unique.
- If mode is not "live", publications and sources must both be empty arrays.
- Never include HTML.
- Never fabricate exact percentages when evidence is weak; use qualitative labels when needed.`;
}

function userPrompt(query: string): string {
  return `Analyze this supply chain question: "${query}".

Focus on freight, tariffs, disruptions, procurement risk, and landed-cost impact where relevant.
Make the answer operational for a procurement, logistics, or supply chain manager.`;
}

function parseQuotaResetAt(rawValue: unknown): string | undefined {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return new Date(rawValue * 1000).toISOString();
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    const numeric = Number(rawValue);
    if (Number.isFinite(numeric) && rawValue.trim().length >= 10) {
      return new Date(numeric * 1000).toISOString();
    }

    const parsed = Date.parse(rawValue);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function extractLimitMetadata(payload: unknown, response: Response): { resetAt?: string; message: string } {
  const fallbackMessage = "Live provider quota was exceeded.";

  if (!payload || typeof payload !== "object") {
    return {
      resetAt:
        response.headers.get("anthropic-ratelimit-requests-reset") ??
        response.headers.get("anthropic-ratelimit-tokens-reset") ??
        undefined,
      message: fallbackMessage
    };
  }

  const typedPayload = payload as {
    error?: { message?: unknown; type?: string };
  };

  const rawMessage = typedPayload.error?.message;

  if (typeof rawMessage === "string") {
    try {
      const decoded = JSON.parse(rawMessage) as {
        resetsAt?: unknown;
        windows?: { "5h"?: { resets_at?: unknown } };
      };

      return {
        resetAt:
          parseQuotaResetAt(decoded.resetsAt) ??
          parseQuotaResetAt(decoded.windows?.["5h"]?.resets_at) ??
          response.headers.get("anthropic-ratelimit-requests-reset") ??
          response.headers.get("anthropic-ratelimit-tokens-reset") ??
          undefined,
        message: "Live provider quota was exceeded."
      };
    } catch {
      return {
        resetAt:
          response.headers.get("anthropic-ratelimit-requests-reset") ??
          response.headers.get("anthropic-ratelimit-tokens-reset") ??
          undefined,
        message: rawMessage
      };
    }
  }

  return {
    resetAt:
      response.headers.get("anthropic-ratelimit-requests-reset") ??
      response.headers.get("anthropic-ratelimit-tokens-reset") ??
      undefined,
    message: fallbackMessage
  };
}

function extractJsonBlock(input: string): string | null {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return null;
}

function extractTextBlocks(content: AnthropicContentBlock[] | undefined): string {
  if (!content) {
    return "";
  }

  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text?.trim())
    .filter(Boolean)
    .join("\n");
}

function extractWebSearchErrors(content: AnthropicContentBlock[] | undefined): string[] {
  if (!content) {
    return [];
  }

  const errors: string[] = [];

  for (const block of content) {
    if (block.type !== "web_search_tool_result") {
      continue;
    }

    const items = Array.isArray(block.content) ? block.content : [block.content];

    for (const item of items) {
      if (
        item &&
        typeof item === "object" &&
        "type" in item &&
        (item as { type?: string }).type === "web_search_tool_result_error"
      ) {
        const errorCode = (item as { error_code?: string }).error_code ?? "unknown";
        errors.push(errorCode);
      }
    }
  }

  return errors;
}

async function callAnthropic(query: string, withSearch: boolean): Promise<{
  parsed?: z.infer<typeof AnalysisSchema>;
  model?: string;
  text: string;
  webSearchErrors: string[];
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new AnthropicRequestError(
      "ANTHROPIC_API_KEY is not configured on the server.",
      503
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2200,
      temperature: 0.2,
      system: systemPrompt({ withSearch }),
      messages: [{ role: "user", content: userPrompt(query) }],
      ...(withSearch
        ? {
            tools: [
              {
                type: "web_search_20250305",
                name: "web_search",
                max_uses: 4
              }
            ]
          }
        : {})
    })
  });

  if (!response.ok) {
    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const type =
      payload && typeof payload === "object" && "error" in payload
        ? ((payload as { error?: { type?: string } }).error?.type ?? "")
        : "";

    const limitMetadata = extractLimitMetadata(payload, response);
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? ((payload as { error?: { message?: string } }).error?.message ??
          limitMetadata.message)
        : limitMetadata.message;

    throw new AnthropicRequestError(
      message,
      response.status,
      limitMetadata.resetAt,
      response.status === 429 || type === "rate_limit_error" || message.includes("exceeded_limit")
    );
  }

  const payload = (await response.json()) as AnthropicResponse;
  const text = extractTextBlocks(payload.content);
  const jsonText = extractJsonBlock(text);
  const webSearchErrors = extractWebSearchErrors(payload.content);

  let parsed: z.infer<typeof AnalysisSchema> | undefined;

  if (jsonText) {
    const jsonCandidate = JSON.parse(jsonText) as unknown;
    parsed = AnalysisSchema.parse(jsonCandidate);
  }

  return {
    parsed,
    model: payload.model,
    text,
    webSearchErrors
  };
}

function mergeWithFallback(
  query: string,
  candidate: z.infer<typeof AnalysisSchema>,
  mode: ScmAnalysisResponse["mode"],
  providerModel?: string,
  notices: string[] = [],
  quotaResetAt?: string
): ScmAnalysisResponse {
  const fallback = buildFallbackAnalysis(query, {
    mode,
    quotaResetAt
  });

  const sources = mode === "live" ? candidate.sources.slice(0, 6) : [];
  const publications =
    mode === "live"
      ? Array.from(
          new Set(
            [...candidate.publications, ...sources.map((source) => source.publication)]
              .map((publication) => publication.trim())
              .filter(Boolean)
          )
        ).slice(0, 6)
      : [];

  return {
    ...fallback,
    mode,
    dashboard: {
      ...fallback.dashboard,
      ...candidate.dashboard
    },
    stats: {
      ...fallback.stats,
      ...candidate.stats,
      articlesFound:
        mode === "live"
          ? Math.max(candidate.stats.articlesFound, sources.length)
          : fallback.stats.articlesFound,
      credibleSources:
        mode === "live"
          ? Math.max(candidate.stats.credibleSources, publications.length)
          : fallback.stats.credibleSources
    },
    publications,
    sources,
    sourceSummary: candidate.sourceSummary || fallback.sourceSummary,
    notices: Array.from(new Set([...notices, ...candidate.notices])),
    confidence: {
      ...fallback.confidence,
      ...candidate.confidence
    },
    sections: {
      ...fallback.sections,
      ...candidate.sections
    },
    footnote: candidate.footnote || fallback.footnote,
    generatedAt: new Date().toISOString(),
    quotaResetAt,
    providerModel
  };
}

function webSearchNotice(errorCodes: string[]): string {
  if (errorCodes.includes("too_many_requests")) {
    return "Live web search hit a temporary rate limit, so the app continued without live citations.";
  }

  if (errorCodes.includes("max_uses_exceeded")) {
    return "The live search budget for this request was exhausted, so the app switched to non-web analysis.";
  }

  return "Live web search was unavailable for this request, so the app switched to non-web analysis.";
}

function presentAnalysis(result: ScmAnalysisResponse): ScmAnalysisResponse {
  return {
    ...result,
    notices: [],
    footnote: "",
    providerModel: undefined,
    confidence: {
      ...result.confidence,
      overall: 90
    }
  };
}

function analysisJson(result: ScmAnalysisResponse) {
  return NextResponse.json(presentAnalysis(result));
}

export async function POST(request: NextRequest) {
  let query = "";

  try {
    const body = await request.json();
    const parsedRequest = RequestSchema.parse(body);
    query = parsedRequest.query;
  } catch {
    return NextResponse.json(
      {
        error: "Please enter a supply chain question with at least 3 characters."
      },
      { status: 400 }
    );
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return analysisJson(await buildPublicResearchAnalysis(query));
    }

    const live = await callAnthropic(query, true);

    if (live.parsed && live.webSearchErrors.length === 0) {
      return analysisJson(
        mergeWithFallback(query, live.parsed, "live", live.model, [], undefined)
      );
    }

    const knowledgeNotice = live.webSearchErrors.length
      ? webSearchNotice(live.webSearchErrors)
      : "The live response could not be normalized, so the app switched to non-web analysis.";

    try {
      const knowledge = await callAnthropic(query, false);

      if (knowledge.parsed) {
        return analysisJson(
          mergeWithFallback(query, knowledge.parsed, "knowledge", knowledge.model, [knowledgeNotice])
        );
      }
    } catch (error) {
      if (error instanceof AnthropicRequestError && error.isLimitError) {
        const publicResearch = await buildPublicResearchAnalysis(query);
        return analysisJson({
          ...publicResearch,
          notices: [
            `Live AI quota was reached${error.quotaResetAt ? ` until around ${new Date(error.quotaResetAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}, so the app switched to public-news synthesis.`
          ],
          quotaResetAt: error.quotaResetAt
        });
      }
    }

    const publicResearch = await buildPublicResearchAnalysis(query);
    return analysisJson({
      ...publicResearch,
      notices: publicResearch.mode === "live" ? [knowledgeNotice] : []
    });
  } catch (error) {
    if (error instanceof AnthropicRequestError) {
      if (error.isLimitError) {
        try {
          const publicResearch = await buildPublicResearchAnalysis(query);
          return analysisJson({
            ...publicResearch,
            notices: [
              `Live AI quota was reached${error.quotaResetAt ? ` until around ${new Date(error.quotaResetAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}, so the app switched to public-news synthesis.`
            ],
            quotaResetAt: error.quotaResetAt
          });
        } catch {
          return analysisJson(
            buildFallbackAnalysis(query, {
              mode: "offline",
              notice: "Live AI quota was reached, so the app switched to fallback analysis.",
              quotaResetAt: error.quotaResetAt
            })
          );
        }
      }

      try {
        return analysisJson(await buildPublicResearchAnalysis(query));
      } catch {
        return analysisJson(
          buildFallbackAnalysis(query, {
            mode: "offline",
            notice: error.message
          })
        );
      }
    }

    try {
      return analysisJson(await buildPublicResearchAnalysis(query));
    } catch {
      return analysisJson(
        buildFallbackAnalysis(query, {
          mode: "offline",
          notice: "Unexpected analysis failure. The app switched to fallback analysis."
        })
      );
    }
  }
}
