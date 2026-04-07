import YahooFinance from "yahoo-finance2";
import { MarketSecurity } from "@/lib/market-types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"]
});

const NASDAQ_TRADED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt";
const OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const UNIVERSE_TTL_MS = 12 * 60 * 60 * 1000;

const EXCHANGE_NAMES: Record<string, string> = {
  A: "NYSE American",
  B: "BX",
  C: "National",
  N: "NYSE",
  P: "NYSE Arca",
  Q: "Nasdaq",
  V: "IEX",
  Z: "Cboe"
};

let universeCache:
  | {
      loadedAt: number;
      data: MarketSecurity[];
    }
  | null = null;
let pendingUniverse: Promise<MarketSecurity[]> | null = null;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function mapExchange(code: string): string {
  return EXCHANGE_NAMES[code] ?? (code || "Unknown");
}

function inferAssetType(name: string, isEtf: boolean): string {
  const upperName = name.toUpperCase();

  if (isEtf) {
    return "ETF";
  }

  if (upperName.includes("PREFERRED")) {
    return "Preferred";
  }

  if (upperName.includes("WARRANT")) {
    return "Warrant";
  }

  if (upperName.includes("UNIT")) {
    return "Unit";
  }

  if (upperName.includes("RIGHT")) {
    return "Rights";
  }

  if (upperName.includes("TRUST")) {
    return "Trust";
  }

  if (upperName.includes("NOTE") || upperName.includes("BOND")) {
    return "Debt";
  }

  return "Equity";
}

function rankSecurity(security: MarketSecurity, queryUpper: string): number {
  const symbol = security.symbol.toUpperCase();
  const name = security.name.toUpperCase();

  if (symbol === queryUpper) {
    return 1_000;
  }

  if (symbol.startsWith(queryUpper)) {
    return 900 - symbol.length;
  }

  if (name.startsWith(queryUpper)) {
    return 800 - Math.min(name.length, 120) / 10;
  }

  if (symbol.includes(queryUpper)) {
    return 700 - symbol.indexOf(queryUpper);
  }

  if (name.includes(queryUpper)) {
    return 600 - name.indexOf(queryUpper) / 10;
  }

  return -1;
}

function dedupeSymbols(results: MarketSecurity[]): MarketSecurity[] {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = result.symbol.toUpperCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseNasdaqRows(text: string): MarketSecurity[] {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split("|");

  return lines.reduce<MarketSecurity[]>((results, line) => {
    if (!line || line.startsWith("File Creation Time")) {
      return results;
    }

    const values = line.split("|");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const symbol = normalizeWhitespace(row["Symbol"] ?? "");
    const name = normalizeWhitespace(row["Security Name"] ?? "");
    const isEtf = (row["ETF"] ?? "N") === "Y";
    const isTestIssue = (row["Test Issue"] ?? "N") === "Y";

    if (!symbol || !name || isTestIssue) {
      return results;
    }

    results.push({
      symbol,
      name,
      exchange: mapExchange(row["Listing Exchange"] ?? ""),
      assetType: inferAssetType(name, isEtf),
      isEtf,
      source: "nasdaq-trader"
    });

    return results;
  }, []);
}

async function fetchUniverseFile(url: string): Promise<string> {
  const response = await fetch(url, {
    next: {
      revalidate: 12 * 60 * 60
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load symbol universe from ${url}`);
  }

  return response.text();
}

export async function getMarketUniverse(): Promise<MarketSecurity[]> {
  if (universeCache && Date.now() - universeCache.loadedAt < UNIVERSE_TTL_MS) {
    return universeCache.data;
  }

  if (pendingUniverse) {
    return pendingUniverse;
  }

  pendingUniverse = Promise.all([
    fetchUniverseFile(NASDAQ_TRADED_URL),
    fetchUniverseFile(OTHER_LISTED_URL)
  ])
    .then(([nasdaqTradedText, otherListedText]) => {
      const combined = dedupeSymbols([
        ...parseNasdaqRows(nasdaqTradedText),
        ...parseNasdaqRows(otherListedText.replace("ACT Symbol", "Symbol").replace("Exchange", "Listing Exchange"))
      ]).sort((left, right) => left.symbol.localeCompare(right.symbol));

      universeCache = {
        loadedAt: Date.now(),
        data: combined
      };

      return combined;
    })
    .finally(() => {
      pendingUniverse = null;
    });

  return pendingUniverse;
}

async function searchYahooSymbols(query: string, limit: number): Promise<MarketSecurity[]> {
  const searchResult = await yahooFinance.search(query);

  return dedupeSymbols(
    (searchResult.quotes ?? [])
      .filter((quote) => {
        const type = String(quote.quoteType ?? quote.typeDisp ?? "").toUpperCase();
        return Boolean(quote.symbol) && ["EQUITY", "ETF", "MUTUALFUND"].includes(type);
      })
      .map((quote) => ({
        symbol: String(quote.symbol ?? "").toUpperCase(),
        name: normalizeWhitespace(
          String(quote.longname ?? quote.shortname ?? quote.symbol ?? "Unknown security")
        ),
        exchange: String(quote.exchange ?? quote.exchDisp ?? "Yahoo"),
        assetType: String(quote.typeDisp ?? quote.quoteType ?? "Listed"),
        isEtf: String(quote.quoteType ?? "").toUpperCase() === "ETF",
        region: typeof quote.exchange === "string" ? quote.exchange : undefined,
        source: "yahoo" as const
      }))
  ).slice(0, limit);
}

export async function searchMarketUniverse(query: string, limit = 30): Promise<MarketSecurity[]> {
  const trimmedQuery = normalizeWhitespace(query);

  if (!trimmedQuery) {
    return [];
  }

  const queryUpper = trimmedQuery.toUpperCase();
  const universe = await getMarketUniverse();

  const localMatches = universe
    .map((security) => ({
      security,
      score: rankSecurity(security, queryUpper)
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || left.security.symbol.localeCompare(right.security.symbol))
    .slice(0, limit * 2)
    .map((entry) => entry.security);

  let yahooMatches: MarketSecurity[] = [];

  try {
    yahooMatches = await searchYahooSymbols(trimmedQuery, limit);
  } catch {
    yahooMatches = [];
  }

  return dedupeSymbols([...localMatches, ...yahooMatches]).slice(0, limit);
}
