import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "docs");
const DATA_DIR = join(DOCS_DIR, "data");

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
];

const COUNTRY_ALIASES = {
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

const SECURITY_THEMES = {
  "Western Asia":
    "Regional conflict exposure, sanctions spillover, and energy-route shocks can rapidly move freight, insurance, and procurement costs.",
  "Eastern Europe":
    "Border security tension and sanctions risk can change logistics planning, supplier confidence, and cross-border market access.",
  "Northern Africa":
    "Political volatility around ports, borders, and energy corridors keeps security and logistics planners on alert.",
  "Middle Africa":
    "Domestic security pressure and fragile transport infrastructure can create sudden execution risk across inland supply routes.",
  "Western Africa":
    "Port reliability, regional political turnover, and corridor security are the main logistics watchpoints.",
  "South-Eastern Asia":
    "Sea-lane dependence and regional power competition matter because shipping continuity is central to market access.",
  "Eastern Asia":
    "Technology restrictions, alliance signaling, and maritime friction shape security pressure more than land-border intensity alone.",
  "Southern Asia":
    "Border friction, energy dependence, and domestic political shocks can alter execution risk across major trade lanes.",
  default:
    "Security, sanctions, and route disruption remain part of the market picture even when the country is not in a front-line conflict zone."
};

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function percentileFromRank(rank, total) {
  if (!rank || total <= 1) {
    return 0;
  }

  return ((total - rank) / (total - 1)) * 100;
}

function formatDate(rawValue) {
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

function formatLargeNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000_000 ? 1 : 0
  }).format(value);
}

function formatArea(value) {
  return `${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value)} sq km`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    currency: "USD",
    style: "currency",
    maximumFractionDigits: 1
  }).format(value);
}

function getContinent(country) {
  return country.continents?.[0] || country.region || "Unknown";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 SCM-GitHub-Pages/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} with status ${response.status}.`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 SCM-GitHub-Pages/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} with status ${response.status}.`);
  }

  return response.text();
}

async function fetchCountries() {
  const countries = await fetchJson(REST_COUNTRIES_URL);
  return countries.filter((country) => country.cca2 && country.name?.common);
}

async function fetchIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=400&mrnev=1`;
  const payload = await fetchJson(url);
  const records = Array.isArray(payload?.[1]) ? payload[1] : [];
  const values = new Map();

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

function rankCountries(countries, targetCode, getValue) {
  const ranked = countries
    .map((country) => ({
      code: country.cca2,
      value: getValue(country)
    }))
    .filter((country) => country.value != null)
    .sort((left, right) => right.value - left.value);

  const rank = ranked.findIndex((country) => country.code === targetCode) + 1;

  return {
    rank: rank > 0 ? rank : null,
    total: ranked.length
  };
}

function rankIndicator(values, countries, targetCode, continent) {
  const world = countries
    .map((country) => ({
      code: country.cca2,
      continent: getContinent(country),
      value: values.get(country.cca2) ?? null
    }))
    .filter((country) => country.value != null);

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

function summarizeHeadline(title) {
  const cleaned = title.replace(/\s+-\s+[^-]+$/, "").trim();
  return cleaned ? `${cleaned}.` : "Current coverage signals a market-relevant development.";
}

async function searchNews(query, category, limit = 2) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const xml = await fetchText(url.toString());
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => match[1])
    .slice(0, limit * 4);

  const headlines = [];

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

function fallbackGlobalInteractions() {
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

async function fetchGlobalInteractions() {
  try {
    const nested = await Promise.all(
      GLOBAL_INTERACTION_QUERIES.map((entry) => searchNews(entry.query, entry.category, 2))
    );

    const seen = new Set();

    const headlines = nested
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

    return headlines.length > 0 ? headlines : fallbackGlobalInteractions();
  } catch (error) {
    console.warn("Falling back to static global interactions:", error.message);
    return fallbackGlobalInteractions();
  }
}

function labelFromScore(score) {
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

function factorLabel(score) {
  if (score >= 75) {
    return "Strong";
  }

  if (score >= 55) {
    return "Balanced";
  }

  return "Constrained";
}

function buildStanding(label, value, worldRank, worldTotal, continentRank, continentTotal) {
  return {
    label,
    value,
    worldRank,
    worldTotal,
    continentRank,
    continentTotal
  };
}

function strategicNarrative(country, continent, strategicPosition) {
  const subregion = country.subregion || "";
  const bordersCount = country.borders?.length ?? 0;
  const baseTheme = SECURITY_THEMES[subregion] || SECURITY_THEMES.default;

  if (strategicPosition >= 75) {
    return `${baseTheme} ${country.name.common} carries above-average geopolitical relevance because of its location, scale, or corridor role.`;
  }

  if (bordersCount >= 5) {
    return `${baseTheme} Multiple land borders make regional spillover risk more relevant for ${country.name.common} than it is for many peers in ${continent}.`;
  }

  return `${baseTheme} For ${country.name.common}, the bigger market story is usually indirect spillover through partners, shipping lanes, and policy alignment.`;
}

function buildCountryInteractions(country, metrics) {
  const {
    continent,
    bargainingLabel,
    exportRank,
    exportShare,
    gdpRank,
    economicWeight,
    tradeLeverage,
    strategicPosition
  } = metrics;

  const domesticPressure =
    economicWeight >= 75
      ? `${country.name.common}'s domestic policy changes can move supplier sentiment, labor cost expectations, and demand planning across the wider region.`
      : `Domestic politics matter mainly through labor reliability, election cycles, industrial policy, and execution discipline inside ${country.name.common}.`;

  const diplomacyPressure =
    tradeLeverage >= 75
      ? `${country.name.common} has real room to negotiate because buyers, suppliers, or corridor partners depend on its market access or trade volumes.`
      : `${country.name.common} must usually balance larger powers carefully, using regional alignment and selective partnerships to protect market access.`;

  return [
    {
      title: `${country.name.common} trade leverage watch`,
      publication: "SCM Country Model",
      date: "Current",
      category: "Trade and economy",
      summary:
        exportRank.worldRank && exportRank.worldRank <= 20
          ? `${country.name.common} is one of the world's more important export economies, which lifts its bargaining leverage over counterparties and supply access.`
          : exportShare && exportShare >= 30
            ? `Exports make up about ${exportShare.toFixed(1)}% of GDP, so external demand and trade policy shifts can move market conditions quickly.`
            : `${country.name.common} has ${bargainingLabel.toLowerCase()} bargaining power, but trade leverage is still shaped more by partner concentration and market access than sheer size alone.`
    },
    {
      title: `${country.name.common} security and logistics watch`,
      publication: "SCM Country Model",
      date: "Current",
      category: "War and security",
      summary: strategicNarrative(country, continent, strategicPosition)
    },
    {
      title: `${country.name.common} domestic execution watch`,
      publication: "SCM Country Model",
      date: "Current",
      category: "Domestic politics and unrest",
      summary: domesticPressure
    },
    {
      title: `${country.name.common} bloc and diplomacy watch`,
      publication: "SCM Country Model",
      date: "Current",
      category: "Strategic rivalry and diplomacy",
      summary:
        gdpRank.worldRank && gdpRank.worldRank <= 15
          ? `${country.name.common} matters enough economically that alignment choices can influence larger bloc competition and investment flows. ${diplomacyPressure}`
          : diplomacyPressure
    }
  ];
}

function getSearchTerms(country) {
  const canonicalNames = [country.name.common, country.name.official ?? ""];
  const reverseAliases = Object.entries(COUNTRY_ALIASES)
    .filter(([, canonical]) =>
      canonicalNames.some((name) => normalize(name) === normalize(canonical))
    )
    .map(([alias]) => alias);

  return [...canonicalNames, ...reverseAliases, country.cca2, country.cca3 ?? ""]
    .map(normalize)
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);
}

async function buildDataset() {
  const [countries, gdpValues, exportValues, exportShareValues, globalInteractions] =
    await Promise.all([
      fetchCountries(),
      fetchIndicator("NY.GDP.MKTP.CD"),
      fetchIndicator("NE.EXP.GNFS.CD"),
      fetchIndicator("NE.EXP.GNFS.ZS"),
      fetchGlobalInteractions()
    ]);

  const countriesByContinent = new Map();

  for (const country of countries) {
    const continent = getContinent(country);

    if (!countriesByContinent.has(continent)) {
      countriesByContinent.set(continent, []);
    }

    countriesByContinent.get(continent).push(country);
  }

  const entries = countries
    .slice()
    .sort((left, right) => left.name.common.localeCompare(right.name.common))
    .map((country) => {
      const continent = getContinent(country);
      const continentCountries = countriesByContinent.get(continent) || [];
      const areaRank = rankCountries(countries, country.cca2, (entry) => entry.area ?? null);
      const populationRank = rankCountries(countries, country.cca2, (entry) => entry.population ?? null);
      const continentAreaRank = rankCountries(
        continentCountries,
        country.cca2,
        (entry) => entry.area ?? null
      );
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
          (continent === "Asia" ? 22 : continent === "Europe" ? 18 : 14),
        12,
        95
      );

      const bargainingScore = Math.round(
        clamp(economicWeight * 0.46 + tradeLeverage * 0.34 + strategicPosition * 0.2, 15, 95)
      );
      const bargainingLabel = labelFromScore(bargainingScore);

      const standings = [
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

      const bargainingFactors = [
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
          explanation: `Area, border reach, and regional exposure put ${country.name.common} in a ${factorLabel(strategicPosition).toLowerCase()} strategic position relative to peers in ${continent}.`
        }
      ];

      const overview = `${country.name.common} is a ${continent}-based market with ${formatArea(country.area ?? 0)} of territory and a population of ${formatLargeNumber(country.population ?? 0)}. It ranks #${gdpRank.worldRank ?? "-"} in the world by GDP and #${gdpRank.continentRank ?? "-"} in ${continent}, which gives it ${bargainingLabel.toLowerCase()} bargaining power in current markets.`;
      const continentPosition = `${country.name.common} stands #${gdpRank.continentRank ?? "-"} in ${continent} by GDP, #${continentAreaRank.rank ?? "-"} by area, and #${continentPopulationRank.rank ?? "-"} by population.`;
      const worldPosition = `Globally, it sits #${gdpRank.worldRank ?? "-"} by GDP, #${areaRank.rank ?? "-"} by area, and #${populationRank.rank ?? "-"} by population.`;

      return {
        searchTerms: getSearchTerms(country),
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
        countryInteractions: buildCountryInteractions(country, {
          continent,
          bargainingLabel,
          exportRank,
          exportShare,
          gdpRank,
          economicWeight,
          tradeLeverage,
          strategicPosition
        }),
        globalInteractions
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    quickCountries: [
      "United States",
      "China",
      "India",
      "Germany",
      "Japan",
      "Brazil",
      "Saudi Arabia",
      "Russia",
      "South Korea",
      "United Arab Emirates"
    ],
    countries: entries
  };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const payload = await buildDataset();
  await writeFile(join(DATA_DIR, "country-intel.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${payload.countries.length} countries to docs/data/country-intel.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
