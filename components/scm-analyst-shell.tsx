"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CountryIntelResponse } from "@/lib/scm-types";

const QUICK_COUNTRIES = [
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
] as const;

const KPI_GUIDE = [
  "On-time delivery rate measures how reliably a country-linked network meets promised dates.",
  "Damage-free delivery rate shows logistics quality and handling discipline.",
  "Perfect order rate combines timeliness and quality into one executive service metric.",
  "Freight-bill accuracy protects cash flow by catching pricing, weight, and billing errors.",
  "Order fill rate and customer order cycle time show whether demand is actually being served fast enough.",
  "Inventory turnover reveals whether stock is moving efficiently or absorbing unnecessary capital.",
  "Cash-to-cash cycle time shows how long working capital stays trapped inside the chain.",
  "Supplier reliability, lead times, production cycle time, and throughput show real upstream resilience."
] as const;

function toneForScore(score: number): string {
  if (score >= 75) {
    return "toneGood";
  }

  if (score >= 55) {
    return "toneWatch";
  }

  return "toneRisk";
}

function barColor(score: number): string {
  if (score >= 75) {
    return "#18755d";
  }

  if (score >= 55) {
    return "#8b6408";
  }

  return "#a3392a";
}

function rankText(rank: number | null, total: number): string {
  if (!rank || !total) {
    return "No rank";
  }

  return `#${rank} of ${total}`;
}

export default function ScmAnalystShell() {
  const [country, setCountry] = useState("United States");
  const [result, setResult] = useState<CountryIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCountry(nextCountry: string) {
    const value = nextCountry.trim();

    if (!value) {
      return;
    }

    setCountry(value);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/scm/country-intel", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ country: value })
      });

      const payload = (await response.json()) as CountryIntelResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to build the country market picture right now.");
      }

      setResult(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to build the country market picture right now."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCountry("United States");
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadCountry(country);
  }

  const factorChart =
    result?.bargainingFactors.map((factor) => ({
      name: factor.title,
      score: factor.score
    })) ?? [];

  return (
    <div className="shell">
      <div className="page">
        <section className="hero">
          <div className="glow glowOne" />
          <div className="glow glowTwo" />

          <div className="heroTopline">World Supply Chain Country Intelligence</div>
          <h1 className="heroTitle">Search any country and see where it stands in the current market.</h1>
          <p className="heroSub">
            Compare each country by area, continent, world market weight, bargaining power, and
            live geopolitical interaction pressure across wars, tensions, sanctions, protests, and
            trade friction.
          </p>

          <form className="searchWrap" onSubmit={handleSubmit}>
            <input
              className="searchInput"
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Search a country like Germany, India, Brazil, Saudi Arabia, or Japan"
              value={country}
            />
            <button className="searchButton" disabled={loading} type="submit">
              {loading ? "Loading..." : "Analyze Country"}
            </button>
          </form>

          <div className="quickRow">
            {QUICK_COUNTRIES.map((item) => (
              <button
                className="quickButton"
                key={item}
                onClick={() => void loadCountry(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {error ? <div className="errorBanner">{error}</div> : null}

        {loading && !result ? (
          <section className="loadingPanel">
            <div className="loadingPulse" />
            <div>
              <div className="loadingTitle">Refreshing the country market picture</div>
              <div className="loadingText">
                Pulling country, continent, world-market, and interaction data into one view.
              </div>
            </div>
          </section>
        ) : null}

        {result ? (
          <div className="results">
            <section className="topGrid">
              <article className="panel overviewPanel">
                <div className="sectionEyebrow">Current Position</div>
                <h2 className="overviewTitle">{result.marketPosition.headline}</h2>

                <div className="countryMeta">
                  <span>{result.country.name}</span>
                  <span>{result.country.capital}</span>
                  <span>{result.country.continent}</span>
                  <span>{result.country.subregion}</span>
                  <span>{result.country.bordersCount} land borders</span>
                </div>

                <p className="overviewText">{result.marketPosition.overview}</p>

                <div className="positionGrid">
                  <div className="positionCard">
                    <span className="cardLabel">Continent Standing</span>
                    <strong>{result.marketPosition.continentPosition}</strong>
                  </div>
                  <div className="positionCard">
                    <span className="cardLabel">World Standing</span>
                    <strong>{result.marketPosition.worldPosition}</strong>
                  </div>
                </div>
              </article>

              <article className="panel powerPanel">
                <div className="sectionEyebrow">Bargaining Power</div>
                <div className="scoreRing">
                  <div className="scoreCore">
                    <strong>{result.bargainingPower.score}</strong>
                    <span>{result.bargainingPower.label}</span>
                  </div>
                </div>
                <p className="powerText">{result.bargainingPower.summary}</p>
                <div className="confidenceChip">
                  <span>Analyst confidence</span>
                  <strong>{result.confidence}%</strong>
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panelHead">
                <div>
                  <div className="sectionEyebrow">Area, Continent, and World Position</div>
                  <h3 className="panelTitle">
                    These standings show where {result.country.name} sits in the hierarchy that
                    matters for market influence.
                  </h3>
                </div>
              </div>

              <div className="standingGrid">
                {result.standings.map((standing) => (
                  <article className="standingCard" key={standing.label}>
                    <div className="cardLabel">{standing.label}</div>
                    <div className="standingValue">{standing.value}</div>
                    <div className="rankPair">
                      <div>
                        <span className="rankLabel">World</span>
                        <strong>{rankText(standing.worldRank, standing.worldTotal)}</strong>
                      </div>
                      <div>
                        <span className="rankLabel">{result.country.continent}</span>
                        <strong>{rankText(standing.continentRank, standing.continentTotal)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="factorGrid">
              <article className="panel chartPanel">
                <div className="panelHead">
                  <div>
                    <div className="sectionEyebrow">Bargaining Power by Factor</div>
                    <h3 className="panelTitle">
                      Economic weight, trade leverage, and strategic position are the three forces
                      behind the score.
                    </h3>
                  </div>
                </div>

                <div className="chartFrame">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={factorChart}
                      layout="vertical"
                      margin={{ top: 10, right: 22, left: 18, bottom: 4 }}
                    >
                      <CartesianGrid stroke="rgba(16, 33, 31, 0.08)" strokeDasharray="4 4" />
                      <XAxis domain={[0, 100]} type="number" tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={128}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(15,95,112,0.06)" }}
                        contentStyle={{
                          backgroundColor: "rgba(255,255,255,0.98)",
                          border: "1px solid rgba(16,33,31,0.12)",
                          borderRadius: 16
                        }}
                      />
                      <Bar dataKey="score" radius={[10, 10, 10, 10]}>
                        {factorChart.map((entry) => (
                          <Cell fill={barColor(entry.score)} key={entry.name} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="panel factorPanel">
                <div className="panelHead">
                  <div>
                    <div className="sectionEyebrow">Three Factors Explained</div>
                    <h3 className="panelTitle">This is why the market is reading the country this way.</h3>
                  </div>
                </div>

                <div className="factorList">
                  {result.bargainingFactors.map((factor) => (
                    <div className="factorCard" key={factor.title}>
                      <div className="factorTop">
                        <div>
                          <strong>{factor.title}</strong>
                          <span className={toneForScore(factor.score)}>{factor.label}</span>
                        </div>
                        <div className="factorScore">{factor.score}</div>
                      </div>
                      <p>{factor.explanation}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="newsGrid">
              <article className="panel">
                <div className="panelHead">
                    <div>
                      <div className="sectionEyebrow">Country Interaction Radar</div>
                      <h3 className="panelTitle">
                      The current pressure points shaping {result.country.name}
                      {"'"}s market stance.
                      </h3>
                    </div>
                </div>

                <div className="newsList">
                  {result.countryInteractions.map((headline) => (
                    <article className="newsCard" key={`${headline.category}-${headline.title}`}>
                      <div className="newsMeta">
                        <span className="newsTag">{headline.category}</span>
                        <span>
                          {headline.publication} · {headline.date}
                        </span>
                      </div>
                      {headline.url ? (
                        <a className="newsTitle" href={headline.url} rel="noreferrer" target="_blank">
                          {headline.title}
                        </a>
                      ) : (
                        <div className="newsTitle">{headline.title}</div>
                      )}
                      <p>{headline.summary}</p>
                    </article>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panelHead">
                  <div>
                    <div className="sectionEyebrow">Global Market Tension Radar</div>
                    <h3 className="panelTitle">
                      Major current interactions in the world that can ripple into market behavior.
                    </h3>
                  </div>
                </div>

                <div className="newsList">
                  {result.globalInteractions.map((headline) => (
                    <article className="newsCard" key={`${headline.category}-${headline.title}`}>
                      <div className="newsMeta">
                        <span className="newsTag">{headline.category}</span>
                        <span>
                          {headline.publication} · {headline.date}
                        </span>
                      </div>
                      {headline.url ? (
                        <a className="newsTitle" href={headline.url} rel="noreferrer" target="_blank">
                          {headline.title}
                        </a>
                      ) : (
                        <div className="newsTitle">{headline.title}</div>
                      )}
                      <p>{headline.summary}</p>
                    </article>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panelHead">
                <div>
                  <div className="sectionEyebrow">Supply Chain KPI Lens</div>
                  <h3 className="panelTitle">
                    The dashboard still reads every country through these core supply-chain metrics.
                  </h3>
                </div>
              </div>

              <div className="guideGrid">
                {KPI_GUIDE.map((item) => (
                  <div className="guideCard" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .shell {
          --bg: #eff2ec;
          --bg2: #f8f6ef;
          --surface: rgba(255, 255, 255, 0.84);
          --line: rgba(16, 33, 31, 0.1);
          --lineStrong: rgba(16, 33, 31, 0.16);
          --text: #10211f;
          --soft: #4e5f5a;
          --muted: #7a8782;
          --sea: #0f5f70;
          --green: #18755d;
          --amber: #8b6408;
          --red: #a3392a;
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 0%, rgba(15, 95, 112, 0.18), transparent 22%),
            radial-gradient(circle at 88% 8%, rgba(24, 117, 93, 0.14), transparent 20%),
            linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%);
          color: var(--text);
          font-family: var(--font-dm-sans), sans-serif;
        }

        .page {
          max-width: 1380px;
          margin: 0 auto;
          padding: 34px 20px 100px;
        }

        .hero,
        .panel,
        .loadingPanel,
        .errorBanner {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 30px;
          background: var(--surface);
          backdrop-filter: blur(18px);
          box-shadow:
            0 22px 58px rgba(16, 33, 31, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.68);
        }

        .hero {
          padding: 34px;
          margin-bottom: 20px;
          background:
            linear-gradient(140deg, rgba(255, 255, 255, 0.92), rgba(237, 246, 243, 0.86)),
            rgba(255, 255, 255, 0.9);
        }

        .glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(8px);
          pointer-events: none;
        }

        .glowOne {
          width: 240px;
          height: 240px;
          right: -30px;
          top: -80px;
          background: rgba(15, 95, 112, 0.15);
        }

        .glowTwo {
          width: 180px;
          height: 180px;
          left: -40px;
          bottom: -80px;
          background: rgba(24, 117, 93, 0.12);
        }

        .heroTopline,
        .sectionEyebrow,
        .cardLabel,
        .rankLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
        }

        .heroTitle,
        .overviewTitle,
        .panelTitle {
          font-family: var(--font-fraunces), serif;
          letter-spacing: -0.04em;
        }

        .heroTitle {
          max-width: 820px;
          margin: 14px 0 10px;
          font-size: 54px;
          line-height: 0.98;
        }

        .heroSub {
          max-width: 860px;
          margin: 0;
          color: var(--soft);
          line-height: 1.8;
          font-size: 15px;
        }

        .searchWrap {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          margin-top: 24px;
          padding: 10px;
          border-radius: 24px;
          border: 1px solid var(--lineStrong);
          background: rgba(255, 255, 255, 0.8);
        }

        .searchInput {
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 16px;
          padding: 10px 12px;
        }

        .searchInput::placeholder {
          color: var(--muted);
        }

        .searchButton,
        .quickButton {
          border: 0;
          cursor: pointer;
          transition: 0.14s ease;
        }

        .searchButton {
          min-width: 164px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f5f70, #18755d);
          color: white;
          font-weight: 700;
          padding: 0 18px;
          box-shadow: 0 14px 28px rgba(15, 95, 112, 0.18);
        }

        .searchButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .quickRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .quickButton {
          border-radius: 999px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid var(--lineStrong);
          color: var(--soft);
          font-size: 12px;
        }

        .quickButton:hover {
          color: var(--sea);
          background: rgba(15, 95, 112, 0.08);
        }

        .errorBanner,
        .loadingPanel {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
          margin-bottom: 18px;
        }

        .errorBanner {
          color: var(--red);
          background: rgba(255, 244, 242, 0.94);
        }

        .loadingPulse {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #0f5f70, #18755d);
          box-shadow: 0 0 0 10px rgba(15, 95, 112, 0.08);
          animation: pulse 1.8s infinite;
        }

        .loadingTitle {
          font-family: var(--font-fraunces), serif;
          font-size: 22px;
        }

        .loadingText {
          margin-top: 4px;
          color: var(--soft);
        }

        .results,
        .topGrid,
        .positionGrid,
        .standingGrid,
        .factorGrid,
        .newsGrid,
        .guideGrid {
          display: grid;
          gap: 18px;
        }

        .topGrid {
          grid-template-columns: 1.3fr 0.8fr;
        }

        .panel {
          padding: 22px;
        }

        .panelHead {
          margin-bottom: 16px;
        }

        .overviewTitle {
          margin: 10px 0 14px;
          font-size: 38px;
          line-height: 1.05;
        }

        .countryMeta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .countryMeta span,
        .newsTag,
        .confidenceChip,
        .metricPill,
        .toneGood,
        .toneWatch,
        .toneRisk {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--lineStrong);
          background: rgba(255, 255, 255, 0.8);
        }

        .overviewText,
        .powerText,
        .factorCard p,
        .newsCard p,
        .guideCard {
          color: var(--soft);
          line-height: 1.8;
          font-size: 14px;
        }

        .positionGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 18px;
        }

        .positionCard,
        .standingCard,
        .factorCard,
        .newsCard,
        .guideCard {
          border-radius: 24px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        }

        .positionCard {
          padding: 16px;
        }

        .positionCard strong {
          display: block;
          margin-top: 10px;
          font-size: 15px;
          line-height: 1.6;
        }

        .powerPanel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .scoreRing {
          display: grid;
          place-items: center;
          width: 190px;
          height: 190px;
          margin: 10px auto 20px;
          border-radius: 999px;
          background:
            radial-gradient(circle at center, rgba(255, 255, 255, 0.98) 45%, transparent 46%),
            conic-gradient(#0f5f70 0deg 220deg, #18755d 220deg 324deg, rgba(15, 95, 112, 0.12) 324deg 360deg);
          box-shadow:
            inset 0 0 0 10px rgba(255, 255, 255, 0.75),
            0 14px 32px rgba(15, 95, 112, 0.12);
        }

        .scoreCore {
          display: grid;
          place-items: center;
          width: 120px;
          height: 120px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          text-align: center;
        }

        .scoreCore strong {
          font-family: var(--font-fraunces), serif;
          font-size: 34px;
          line-height: 1;
        }

        .scoreCore span {
          margin-top: 6px;
          color: var(--muted);
          font-size: 11px;
        }

        .confidenceChip {
          justify-content: space-between;
          margin-top: 16px;
          color: var(--soft);
        }

        .confidenceChip strong {
          color: var(--sea);
          font-family: var(--font-fraunces), serif;
          font-size: 22px;
        }

        .standingGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .standingCard {
          padding: 16px;
        }

        .standingValue {
          margin-top: 12px;
          font-family: var(--font-fraunces), serif;
          font-size: 30px;
          line-height: 1;
        }

        .rankPair {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--line);
        }

        .rankPair strong {
          display: block;
          margin-top: 8px;
          font-size: 15px;
        }

        .factorGrid {
          grid-template-columns: 1fr 1fr;
        }

        .chartFrame {
          height: 320px;
          margin-top: 6px;
        }

        .factorList,
        .newsList {
          display: grid;
          gap: 12px;
        }

        .factorCard,
        .newsCard {
          padding: 16px;
        }

        .factorTop {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 12px;
        }

        .factorTop strong {
          display: block;
          font-size: 18px;
        }

        .factorScore {
          font-family: var(--font-fraunces), serif;
          font-size: 26px;
          line-height: 1;
        }

        .toneGood {
          color: var(--green);
          background: rgba(24, 117, 93, 0.12);
        }

        .toneWatch {
          color: var(--amber);
          background: rgba(139, 100, 8, 0.12);
        }

        .toneRisk {
          color: var(--red);
          background: rgba(163, 57, 42, 0.12);
        }

        .newsGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .newsMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          color: var(--muted);
        }

        .newsTag {
          color: var(--sea);
          background: rgba(15, 95, 112, 0.08);
        }

        .newsTitle {
          display: block;
          margin-top: 12px;
          color: var(--text);
          font-size: 16px;
          font-weight: 700;
          line-height: 1.45;
          text-decoration: none;
        }

        .newsTitle:hover {
          color: var(--sea);
        }

        .guideGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .guideCard {
          padding: 16px;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.9);
            opacity: 0.55;
          }
        }

        @media (max-width: 1180px) {
          .topGrid,
          .factorGrid,
          .newsGrid,
          .guideGrid,
          .standingGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding-inline: 14px;
          }

          .hero,
          .panel,
          .loadingPanel,
          .errorBanner {
            border-radius: 24px;
          }

          .hero {
            padding: 24px;
          }

          .heroTitle {
            font-size: 38px;
          }

          .overviewTitle,
          .panelTitle {
            font-size: 28px;
          }

          .searchWrap,
          .positionGrid,
          .rankPair {
            grid-template-columns: 1fr;
          }

          .searchButton {
            min-height: 52px;
          }
        }
      `}</style>
    </div>
  );
}
