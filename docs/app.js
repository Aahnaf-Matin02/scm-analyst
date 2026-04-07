const DATA_URL = "./data/country-intel.json";

const state = {
  payload: null,
  active: null
};

const elements = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  countryList: document.getElementById("country-list"),
  quickRow: document.getElementById("quick-row"),
  loadingPanel: document.getElementById("loading-panel"),
  errorPanel: document.getElementById("error-panel"),
  results: document.getElementById("results"),
  headline: document.getElementById("headline"),
  countryMeta: document.getElementById("country-meta"),
  overview: document.getElementById("overview"),
  continentPosition: document.getElementById("continent-position"),
  worldPosition: document.getElementById("world-position"),
  powerRing: document.getElementById("power-ring"),
  powerScore: document.getElementById("power-score"),
  powerLabel: document.getElementById("power-label"),
  powerSummary: document.getElementById("power-summary"),
  standingTitle: document.getElementById("standing-title"),
  standingsGrid: document.getElementById("standings-grid"),
  factorBars: document.getElementById("factor-bars"),
  factorCards: document.getElementById("factor-cards"),
  countryRadarTitle: document.getElementById("country-radar-title"),
  countryNews: document.getElementById("country-news"),
  globalNews: document.getElementById("global-news"),
  generatedAt: document.getElementById("generated-at")
};

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toneForScore(score) {
  if (score >= 75) {
    return "tone-good";
  }

  if (score >= 55) {
    return "tone-watch";
  }

  return "tone-risk";
}

function rankText(rank, total) {
  if (!rank || !total) {
    return "No rank";
  }

  return `#${rank} of ${total}`;
}

function formatGeneratedAt(rawValue) {
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function scoreCountry(entry, query) {
  const needle = normalize(query);

  if (!needle) {
    return -1;
  }

  let best = -1;

  for (const term of entry.searchTerms || []) {
    if (term === needle) {
      best = Math.max(best, 100);
    } else if (term.startsWith(needle)) {
      best = Math.max(best, 86);
    } else if (term.includes(needle)) {
      best = Math.max(best, 72);
    }
  }

  return best;
}

function findCountry(query) {
  const countries = state.payload?.countries || [];
  let best = null;
  let bestScore = -1;

  for (const entry of countries) {
    const score = scoreCountry(entry, query);

    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return bestScore >= 72 ? best : null;
}

function createNode(tag, className, text) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text != null) {
    node.textContent = text;
  }

  return node;
}

function renderStandings(entry) {
  elements.standingsGrid.innerHTML = "";

  for (const standing of entry.standings) {
    const card = createNode("article", "standing-card");
    card.append(createNode("div", "label", standing.label));
    card.append(createNode("div", "standing-value", standing.value));

    const pair = createNode("div", "rank-pair");
    const world = createNode("div");
    world.append(createNode("span", "rank-label", "World"));
    world.append(createNode("strong", "", rankText(standing.worldRank, standing.worldTotal)));
    pair.append(world);

    const continent = createNode("div");
    continent.append(createNode("span", "rank-label", entry.country.continent));
    continent.append(
      createNode("strong", "", rankText(standing.continentRank, standing.continentTotal))
    );
    pair.append(continent);

    card.append(pair);
    elements.standingsGrid.append(card);
  }
}

function renderFactors(entry) {
  elements.factorBars.innerHTML = "";
  elements.factorCards.innerHTML = "";

  for (const factor of entry.bargainingFactors) {
    const bar = createNode("article", "factor-bar");
    const top = createNode("div", "factor-bar-top");
    top.append(createNode("strong", "", factor.title));
    top.append(createNode("span", "score-pill", `${factor.score}/100`));
    bar.append(top);

    const meter = createNode("div", "factor-meter");
    const fill = createNode("div", "factor-fill");
    fill.style.width = `${factor.score}%`;
    meter.append(fill);
    bar.append(meter);
    elements.factorBars.append(bar);

    const card = createNode("article", "factor-card");
    const cardTop = createNode("div", "factor-card-top");
    cardTop.append(createNode("strong", "", factor.title));
    cardTop.append(createNode("span", `score-pill ${toneForScore(factor.score)}`, factor.label));
    card.append(cardTop);
    card.append(createNode("p", "", factor.explanation));
    elements.factorCards.append(card);
  }
}

function renderNews(list, target) {
  target.innerHTML = "";

  for (const item of list) {
    const card = createNode("article", "news-card");
    const meta = createNode("div", "news-meta");
    meta.append(createNode("span", "news-tag", item.category));
    meta.append(createNode("span", "", `${item.publication} · ${item.date}`));
    card.append(meta);

    if (item.url) {
      const link = createNode("a", "news-title", item.title);
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      card.append(link);
    } else {
      card.append(createNode("div", "news-title", item.title));
    }

    card.append(createNode("p", "", item.summary));
    target.append(card);
  }
}

function render(entry) {
  state.active = entry;
  elements.results.classList.remove("hidden");
  elements.errorPanel.classList.add("hidden");
  elements.loadingPanel.classList.add("hidden");

  elements.headline.textContent = entry.marketPosition.headline;
  elements.countryMeta.innerHTML = "";

  [
    entry.country.name,
    entry.country.capital,
    entry.country.continent,
    entry.country.subregion,
    `${entry.country.bordersCount} land borders`
  ].forEach((item) => {
    elements.countryMeta.append(createNode("span", "", item));
  });

  elements.overview.textContent = entry.marketPosition.overview;
  elements.continentPosition.textContent = entry.marketPosition.continentPosition;
  elements.worldPosition.textContent = entry.marketPosition.worldPosition;
  elements.powerRing.style.setProperty("--ring-angle", `${entry.bargainingPower.score * 3.6}deg`);
  elements.powerScore.textContent = String(entry.bargainingPower.score);
  elements.powerLabel.textContent = entry.bargainingPower.label;
  elements.powerSummary.textContent = entry.bargainingPower.summary;
  elements.standingTitle.textContent = `These standings show where ${entry.country.name} sits in the hierarchy that matters for market influence.`;
  elements.countryRadarTitle.textContent = `The current pressure points shaping ${entry.country.name}'s market stance.`;
  elements.generatedAt.textContent = `Snapshot updated ${formatGeneratedAt(state.payload.generatedAt)}.`;

  renderStandings(entry);
  renderFactors(entry);
  renderNews(entry.countryInteractions, elements.countryNews);
  renderNews(entry.globalInteractions, elements.globalNews);
}

function showError(message) {
  elements.loadingPanel.classList.add("hidden");
  elements.results.classList.add("hidden");
  elements.errorPanel.textContent = message;
  elements.errorPanel.classList.remove("hidden");
}

function setQuery(countryName) {
  const params = new URLSearchParams(window.location.search);
  params.set("country", countryName);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

async function loadDataset() {
  const response = await fetch(DATA_URL);

  if (!response.ok) {
    throw new Error("Unable to load the public GitHub Pages dataset.");
  }

  state.payload = await response.json();
}

function populateLists() {
  elements.countryList.innerHTML = "";

  for (const entry of state.payload.countries) {
    const option = document.createElement("option");
    option.value = entry.country.name;
    elements.countryList.append(option);
  }

  elements.quickRow.innerHTML = "";
  for (const item of state.payload.quickCountries || []) {
    const button = createNode("button", "quick-button", item);
    button.type = "button";
    button.addEventListener("click", () => {
      elements.searchInput.value = item;
      const entry = findCountry(item);
      if (entry) {
        setQuery(entry.country.name);
        render(entry);
      }
    });
    elements.quickRow.append(button);
  }
}

function handleSearch(event) {
  event.preventDefault();
  const query = elements.searchInput.value.trim();

  if (!query) {
    return;
  }

  const entry = findCountry(query);

  if (!entry) {
    showError(`No country matched "${query}". Try a full country name like United States or South Korea.`);
    return;
  }

  setQuery(entry.country.name);
  render(entry);
}

async function main() {
  try {
    await loadDataset();
    populateLists();

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("country") || "United States";
    const entry =
      findCountry(requested) ||
      state.payload.countries.find((item) => item.country.name === "United States");

    if (!entry) {
      throw new Error("The dataset loaded, but the default country could not be found.");
    }

    elements.searchInput.value = entry.country.name;
    setQuery(entry.country.name);
    render(entry);
  } catch (error) {
    showError(
      error instanceof Error ? error.message : "Unable to load the public dashboard right now."
    );
  }
}

elements.searchForm.addEventListener("submit", handleSearch);
main();
