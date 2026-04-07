import {
  BargainingFactor,
  CountryIntelResponse,
  CountryStanding,
  IntelHeadline
} from "@/lib/scm-types";

type BasicCountry = {
  name: {
    common: string;
    official?: string;
  };
  cca2: string;
  cca3?: string;
  region?: string;
  subregion?: string;
  continents?: string[];
  area?: number;
  population?: number;
  capital?: string[];
  borders?: string[];
};

type WorldBankRecord = {
  country?: {
    id?: string;
    value?: string;
  };
  countryiso3code?: string;
  value?: number | null;
};

const REST_COUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,region,subregion,continents,area,population,capital,borders";

const GLOBAL_INTERACTION_QUERIES = [
  {
    category: "Trade war and sanctions",
    query: "global trade war sanctions tariffs market"
  },
  {
    category: "Wars and security",
    query: "global war conflict attack ceasefire shipping chokepoint market"
  },
  {
    category: "Domestic unrest and politics",
    query: "global protests strike election unrest market"
  },
  {
    category: "Cold war and strategic rivalry",
    query: "global cold war strategic rivalry technology restrictions market"
  }
] as const;

const COUNTRY_INTERACTION_QUERIES = [
  {
    category: "Trade and economy",
    buildQuery: (country: string) => `"${country}" economy trade exports investment sanctions`
  },
  {
    category: "War and security",
    buildQuery: (country: string) => `"${country}" war conflict military border sanctions`
  },
  {
    category: "Domestic politics and unrest",
    buildQuery: (country: string) => `"${country}" protest election strike unrest politics`
  },
  {
    category: "Strategic rivalry and diplomacy",
    buildQuery: (country: string) =>
      `"${country}" diplomacy strategic rivalry sanctions alliance corridor market`
  }
] as const;

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  america: "United States",
  uk: "United Kingdom",
  uae: "United Arab Emirates",
  russia: "Russia",
  "south korea": "South Korea",
  "north korea": "North Korea",
  "ivory coast": "Ivory Coast",
  "dr congo": "DR Congo",
  "democratic republic of the congo": "DR Congo",
  "republic of the congo": "Republic of the Congo",
  syria: "Syria",
  laos: "Laos",
  iran: "Iran",
  tanzania: "Tanzania",
  venezuela: "Venezuela",
  bolivia: "Bolivia",
  moldova: "Moldova",
  slovakia: "Slovakia",
  egypt: "Egypt",
  "czech republic": "Czechia"
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatDate(rawValue: string): string {
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatLargeNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000_000 ? 1 : 0
  }).format(value);
}

function formatArea(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value)} sq km`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    currency: "USD",
    style: "currency",
    maximumFractionDigits: 1
  }).format(value);
}

function percentileFromRank(rank: number | null, total: number): number {
  if (!rank || total <= 1) {
    return 0;
  }

  return ((total - rank) / (total - 1)) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function summarizeHeadline(title: string): string {
  const cleaned = title.replace(/\s+-\s+[^-]+$/, "").trim();
  return cleaned ? `${cleaned}.` : "Current coverage signals a market-relevant development.";
}

async function fetchJson<T>(url: string, revalidate = 3600): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 World-Supply-Dashboard/1.0"
    },
    next: {
      revalidate
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string, revalidate = 1800): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 World-Supply-Dashboard/1.0"
    },
    next: {
      revalidate
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} with status ${response.status}.`);
  }

  return response.text();
}

async function fetchCountries(): Promise<BasicCountry[]> {
  const countries = await fetchJson<BasicCountry[]>(REST_COUNTRIES_URL, 86_400);

  return countries.filter((country) => country.cca2 && country.name?.common);
}

async function fetchIndicator(indicator: string): Promise<Map<string, number>> {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=400&mrnev=1`;
  const payload = await fetchJson<[unknown, WorldBankRecord[]]>(url, 43_200);
  const records = Array.isArray(payload?.[1]) ? payload[1] : [];
  const values = new Map<string, number>();

  for (const record of records) {
    const code = record.country?.id?.toUpperCase();
    const value = record.value;
    const name = record.country?.value ?? "";

    if (!code || code.length !== 2 || !name || name === "Aggregates" || value == null) {
      continue;
    }

    if (!values.has(code)) {
      values.set(code, value);
    }
  }

  return values;
}

function resolveCountry(query: string, countries: BasicCountry[]): BasicCountry | null {
  const normalizedQuery = normalize(COUNTRY_ALIASES[normalize(query)] ?? query);

  let bestMatch: BasicCountry | null = null;
  let bestScore = -1;

  for (const country of countries) {
    const aliases = [
      country.name.common,
      country.name.official ?? "",
      country.cca2,
      country.cca3 ?? ""
    ]
      .map(normalize)
      .filter(Boolean);

    let score = 0;

    for (const alias of aliases) {
      if (alias === normalizedQuery) {
        score = Math.max(score, 100);
      } else if (alias.startsWith(normalizedQuery)) {
        score = Math.max(score, 84);
      } else if (alias.includes(normalizedQuery)) {
        score = Math.max(score, 72);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = country;
    }
  }

  return bestScore >= 72 ? bestMatch : null;
}

function getContinent(country: BasicCountry): string {
  return country.continents?.[0] || country.region || "Unknown";
}

function getCountryNeedles(country: BasicCountry): string[] {
  const canonicalNames = [country.name.common, country.name.official ?? ""];
  const reverseAliases = Object.entries(COUNTRY_ALIASES)
    .filter(([, canonical]) =>
      canonicalNames.some((name) => normalize(name) === normalize(canonical))
    )
    .map(([alias]) => alias);

  return [...canonicalNames, ...reverseAliases]
    .map(normalize)
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .filter((value) => value.length >= 4 || value.includes(" "));
}

function headlineMatchesCountry(headline: IntelHeadline, country: BasicCountry): boolean {
  const needles = getCountryNeedles(country);
  const haystack = normalize(`${headline.title} ${headline.summary}`);

  return needles.some((needle) => haystack.includes(needle));
}

function rankCountries<T extends BasicCountry>(
  countries: T[],
  targetCode: string,
  getValue: (country: T) => number | null
) {
  const ranked = countries
    .map((country) => ({
      code: country.cca2,
      value: getValue(country)
    }))
    .filter((country): country is { code: string; value: number } => country.value != null)
    .sort((left, right) => right.value - left.value);

  const rank = ranked.findIndex((country) => country.code === targetCode) + 1;

  return {
    rank: rank > 0 ? rank : null,
    total: ranked.length
  };
}

function rankIndicator(
  values: Map<string, number>,
  countries: BasicCountry[],
  targetCode: string,
  continent: string
) {
  const world = countries
    .map((country) => ({
      code: country.cca2,
      continent: getContinent(country),
      value: values.get(country.cca2) ?? null
    }))
    .filter((country): country is { code: string; continent: string; value: number } => country.value != null);

  const worldRanked = [...world].sort((left, right) => right.value - left.value);
  const continentRanked = worldRanked.filter((country) => country.continent === continent);

  return {
    worldRank: worldRanked.findIndex((country) => country.code === targetCode) + 1 || null,
    worldTotal: worldRanked.length,
    continentRank: continentRanked.findIndex((country) => country.code === targetCode) + 1 || null,
    continentTotal: continentRanked.length,
    value: values.get(targetCode) ?? null
  };
}

function strategicHeadlineScore(headlines: IntelHeadline[]): number {
  const joined = headlines.map((headline) => headline.title.toLowerCase()).join(" ");
  const keywords = [
    "sanction",
    "border",
    "military",
    "war",
    "energy",
    "oil",
    "gas",
    "mineral",
    "rare earth",
    "semiconductor",
    "chip",
    "shipping",
    "port",
    "canal",
    "strait",
    "pipeline",
    "ceasefire",
    "nato",
    "tariff"
  ];
  const hits = keywords.reduce((count, keyword) => count + (joined.includes(keyword) ? 1 : 0), 0);

  return clamp(35 + hits * 4, 35, 92);
}

async function searchNews(query: string, category: string, limit = 2): Promise<IntelHeadline[]> {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const xml = await fetchText(url.toString(), 1800);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => match[1])
    .slice(0, limit * 4);

  const headlines: IntelHeadline[] = [];

  for (const item of items) {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const pubMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);

    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";
    const publication = pubMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "Google News";
    const date = formatDate(dateMatch?.[1]?.trim() ?? "");
    const urlValue = linkMatch?.[1]?.trim();

    if (!title || !publication || !date) {
      continue;
    }

    headlines.push({
      title: title.replace(/\s+-\s+[^-]+$/, "").trim(),
      publication,
      date,
      category,
      summary: summarizeHeadline(title),
      url: urlValue || undefined
    });

    if (headlines.length >= limit) {
      break;
    }
  }

  return headlines;
}

async function fetchCountryInteractions(country: BasicCountry): Promise<IntelHeadline[]> {
  const nested = await Promise.all(
    COUNTRY_INTERACTION_QUERIES.map((entry) =>
      searchNews(entry.buildQuery(country.name.common), entry.category, 3).catch(() => [])
    )
  );

  const seen = new Set<string>();

  return nested
    .flat()
    .filter((headline) => headlineMatchesCountry(headline, country))
    .filter((headline) => {
      const key = `${headline.title}-${headline.publication}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

async function fetchGlobalInteractions(): Promise<IntelHeadline[]> {
  const nested = await Promise.all(
    GLOBAL_INTERACTION_QUERIES.map((entry) =>
      searchNews(entry.query, entry.category, 2).catch(() => [])
    )
  );

  const seen = new Set<string>();

  return nested
    .flat()
    .filter((headline) => {
      const key = `${headline.title}-${headline.publication}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function fallbackCountryInteractions(countryName: string): IntelHeadline[] {
  return [
    {
      title: `${countryName} market watch`,
      publication: "Supply Dashboard",
      date: "Current",
      category: "Trade and economy",
      summary: `${countryName} should be monitored through trade flows, export exposure, and access to key buyer markets when current headline density is thin.`
    },
    {
      title: `${countryName} security and border watch`,
      publication: "Supply Dashboard",
      date: "Current",
      category: "War and security",
      summary: `Border risk, sanctions exposure, and shipping-route vulnerability can quickly change the country's market position even when public coverage is fragmented.`
    },
    {
      title: `${countryName} domestic stability watch`,
      publication: "Supply Dashboard",
      date: "Current",
      category: "Domestic politics and unrest",
      summary: `Domestic unrest, labor action, or political turnover should be tracked because they can disrupt production, ports, and procurement continuity.`
    },
    {
      title: `${countryName} strategic rivalry watch`,
      publication: "Supply Dashboard",
      date: "Current",
      category: "Strategic rivalry and diplomacy",
      summary: `Alliance shifts, sanctions pressure, and corridor diplomacy can change ${countryName}'s leverage over suppliers, buyers, and neighboring markets.`
    }
  ];
}

function fallbackGlobalInteractions(): IntelHeadline[] {
  return [
    {
      title: "Trade war and sanctions watch",
      publication: "Supply Dashboard",
      date: "Current",
      category: "Trade war and sanctions",
      summary: "Tariff moves, export controls, and sanctions remain major sources of price volatility and sourcing pressure."
    },
    {
      title: "War and logistics watch",
      publication: "Supply Dashboard",
      date: "Current",
      category: "Wars and security",
      summary: "Hot conflicts and maritime chokepoint risks continue to influence freight cost, insurance, and route selection."
    },
    {
      title: "Domestic unrest and labor watch",
      publication: "Supply Dashboard",
      date: "Current",
      category: "Domestic unrest and politics",
      summary: "Strikes, elections, and street unrest can cause sudden disruption to factories, border crossings, and port operations."
    },
    {
      title: "Strategic rivalry watch",
      publication: "Supply Dashboard",
      date: "Current",
      category: "Cold war and strategic rivalry",
      summary: "Technology restrictions and bloc competition continue to reshape bargaining power across suppliers and markets."
    }
  ];
}

function withFallbackHeadlines(
  primary: IntelHeadline[],
  fallback: IntelHeadline[],
  minimum: number
): IntelHeadline[] {
  if (primary.length >= minimum) {
    return primary;
  }

  const usedCategories = new Set(primary.map((headline) => headline.category));
  const supplement = fallback.filter((headline) => !usedCategories.has(headline.category));

  return [...primary, ...supplement].slice(0, minimum);
}

function buildStanding(
  label: string,
  value: string,
  worldRank: number | null,
  worldTotal: number,
  continentRank: number | null,
  continentTotal: number
): CountryStanding {
  return {
    label,
    value,
    worldRank,
    worldTotal,
    continentRank,
    continentTotal
  };
}

function labelFromScore(score: number): string {
  if (score >= 80) {
    return "Very High";
  }

  if (score >= 68) {
    return "High";
  }

  if (score >= 55) {
    return "Solid";
  }

  if (score >= 42) {
    return "Moderate";
  }

  return "Limited";
}

function factorLabel(score: number): string {
  if (score >= 75) {
    return "Strong";
  }

  if (score >= 55) {
    return "Balanced";
  }

  return "Constrained";
}

export async function buildCountryIntel(countryQuery: string): Promise<CountryIntelResponse> {
  const [countries, gdpValues, exportValues, exportShareValues, globalInteractionsRaw] =
    await Promise.all([
      fetchCountries(),
      fetchIndicator("NY.GDP.MKTP.CD"),
      fetchIndicator("NE.EXP.GNFS.CD"),
      fetchIndicator("NE.EXP.GNFS.ZS"),
      fetchGlobalInteractions()
    ]);

  const country = resolveCountry(countryQuery, countries);

  if (!country) {
    throw new Error(`Could not find a country matching "${countryQuery}".`);
  }

  const continent = getContinent(country);
  const continentCountries = countries.filter((entry) => getContinent(entry) === continent);
  const countryInteractionsRaw = await fetchCountryInteractions(country);
  const countryInteractions = withFallbackHeadlines(
    countryInteractionsRaw,
    fallbackCountryInteractions(country.name.common),
    4
  );
  const globalInteractions = withFallbackHeadlines(
    globalInteractionsRaw,
    fallbackGlobalInteractions(),
    6
  );

  const areaRank = rankCountries(countries, country.cca2, (entry) => entry.area ?? null);
  const populationRank = rankCountries(countries, country.cca2, (entry) => entry.population ?? null);
  const continentAreaRank = rankCountries(continentCountries, country.cca2, (entry) => entry.area ?? null);
  const continentPopulationRank = rankCountries(
    continentCountries,
    country.cca2,
    (entry) => entry.population ?? null
  );

  const gdpRank = rankIndicator(gdpValues, countries, country.cca2, continent);
  const exportRank = rankIndicator(exportValues, countries, country.cca2, continent);
  const exportShare = exportShareValues.get(country.cca2) ?? null;

  const economicWeight = clamp(
    percentileFromRank(gdpRank.worldRank, gdpRank.worldTotal) * 0.65 +
      percentileFromRank(populationRank.rank, populationRank.total) * 0.35,
    12,
    98
  );
  const tradeLeverage = clamp(
    percentileFromRank(exportRank.worldRank, exportRank.worldTotal) * 0.6 +
      ((exportShare ?? 18) / 40) * 40,
    10,
    96
  );
  const strategicPosition = clamp(
    percentileFromRank(areaRank.rank, areaRank.total) * 0.35 +
      Math.min((country.borders?.length ?? 0) * 6, 24) +
      strategicHeadlineScore(countryInteractions) * 0.41,
    12,
    95
  );

  const bargainingScore = Math.round(
    clamp(economicWeight * 0.46 + tradeLeverage * 0.34 + strategicPosition * 0.2, 15, 95)
  );
  const bargainingLabel = labelFromScore(bargainingScore);

  const standings: CountryStanding[] = [
    buildStanding(
      "Area footprint",
      formatArea(country.area ?? 0),
      areaRank.rank,
      areaRank.total,
      continentAreaRank.rank,
      continentAreaRank.total
    ),
    buildStanding(
      "Population scale",
      formatLargeNumber(country.population ?? 0),
      populationRank.rank,
      populationRank.total,
      continentPopulationRank.rank,
      continentPopulationRank.total
    ),
    buildStanding(
      "GDP weight",
      gdpRank.value ? formatCurrency(gdpRank.value) : "No current GDP figure",
      gdpRank.worldRank,
      gdpRank.worldTotal,
      gdpRank.continentRank,
      gdpRank.continentTotal
    ),
    buildStanding(
      "Export leverage",
      exportRank.value ? formatCurrency(exportRank.value) : "No current export figure",
      exportRank.worldRank,
      exportRank.worldTotal,
      exportRank.continentRank,
      exportRank.continentTotal
    )
  ];

  const bargainingFactors: BargainingFactor[] = [
    {
      title: "Economic weight",
      score: Math.round(economicWeight),
      label: factorLabel(economicWeight),
      explanation: `${country.name.common} sits at #${gdpRank.worldRank ?? "-"} globally by GDP and #${populationRank.rank ?? "-"} by population, which drives its ability to influence trade terms and demand conditions.`
    },
    {
      title: "Trade leverage",
      score: Math.round(tradeLeverage),
      label: factorLabel(tradeLeverage),
      explanation: `${country.name.common} ranks #${exportRank.worldRank ?? "-"} globally by exports${exportShare ? ` and exports equal about ${exportShare.toFixed(1)}% of GDP` : ""}, shaping how much leverage it has in supply and market access negotiations.`
    },
    {
      title: "Strategic position",
      score: Math.round(strategicPosition),
      label: factorLabel(strategicPosition),
      explanation: `Area, border reach, and current geopolitical headlines put ${country.name.common} in a ${factorLabel(strategicPosition).toLowerCase()} strategic position relative to peers in ${continent}.`
    }
  ];

  const overview = `${country.name.common} is a ${continent}-based market with ${formatArea(country.area ?? 0)} of territory and a population of ${formatLargeNumber(country.population ?? 0)}. It ranks #${gdpRank.worldRank ?? "-"} in the world by GDP and #${gdpRank.continentRank ?? "-"} in ${continent}, which gives it ${bargainingLabel.toLowerCase()} bargaining power in current markets.`;
  const continentPosition = `${country.name.common} stands #${gdpRank.continentRank ?? "-"} in ${continent} by GDP, #${continentAreaRank.rank ?? "-"} by area, and #${continentPopulationRank.rank ?? "-"} by population.`;
  const worldPosition = `Globally, it sits #${gdpRank.worldRank ?? "-"} by GDP, #${areaRank.rank ?? "-"} by area, and #${populationRank.rank ?? "-"} by population.`;

  return {
    country: {
      name: country.name.common,
      code: country.cca2,
      capital: country.capital?.[0] ?? "N/A",
      region: country.region ?? "Unknown",
      subregion: country.subregion ?? "Unknown",
      continent,
      areaKm2: country.area ?? 0,
      population: country.population ?? 0,
      bordersCount: country.borders?.length ?? 0
    },
    confidence: 90,
    bargainingPower: {
      score: bargainingScore,
      label: bargainingLabel,
      summary: `${country.name.common} has ${bargainingLabel.toLowerCase()} bargaining power because its market size, export leverage, and strategic relevance place it above many peers in current global trade and supply negotiations.`
    },
    marketPosition: {
      headline: `${country.name.common} holds ${bargainingLabel.toLowerCase()} bargaining power in the current market.`,
      overview,
      continentPosition,
      worldPosition
    },
    standings,
    bargainingFactors,
    countryInteractions,
    globalInteractions,
    generatedAt: new Date().toISOString()
  };
}
