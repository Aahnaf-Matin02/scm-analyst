import { ScmAnalysisMode, ScmAnalysisResponse } from "@/lib/scm-types";

type FallbackOptions = {
  mode?: ScmAnalysisMode;
  notice?: string;
  quotaResetAt?: string;
  footnote?: string;
};

type Scenario = {
  dashboard: ScmAnalysisResponse["dashboard"];
  confidence: ScmAnalysisResponse["confidence"];
  sections: ScmAnalysisResponse["sections"];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function detectScenario(query: string): Scenario {
  const lower = query.toLowerCase();

  if (
    lower.includes("red sea") ||
    lower.includes("suez") ||
    lower.includes("bab el-mandeb") ||
    lower.includes("houthi")
  ) {
    return {
      dashboard: {
        freightCostImpact: "Elevated",
        tariffPressure: "Low",
        disruptionRisk: "High",
        costOutlook: "Rising"
      },
      confidence: {
        cost: 63,
        risk: 68,
        challenge: 72,
        strategy: 66,
        overall: 64,
        evidence: 59
      },
      sections: {
        cost: `#### Freight & Shipping Costs
Rerouting away from the Suez Canal usually pushes ocean costs higher even when spot rates are not spiking everywhere at once. The main mechanisms are longer transit times around the Cape of Good Hope, extra bunker consumption, lower effective vessel availability, and more equipment repositioning pressure.

#### Tariffs & Trade Duties
Tariffs are usually not the primary cost lever in a Red Sea disruption scenario. The bigger landed-cost effect comes from transport, insurance, expediting, and working-capital drag rather than a new customs duty.

#### Other SCM Cost Factors
Expect pressure on safety stock, inbound planning, and lead-time buffers. Longer voyages can raise inventory carrying cost, create more variability in replenishment timing, and increase the odds of premium freight if downstream production schedules cannot slip.

#### Cost Impact Summary Table
| Cost Factor | Current Level | Direction | Impact on Product Cost |
| Ocean freight | Volatile | Up | Higher landed cost when routes lengthen |
| Fuel and bunker | Sensitive | Up | Extra sailing distance increases fuel burn |
| Inventory carrying | Elevated | Up | More cash tied up in goods in transit |
| Insurance and contingencies | Firm | Up | Higher routing and war-risk uncertainty |

Data confidence: 63%`,
        risk: `#### Active Disruptions
The core risk is route instability rather than a single one-time surcharge. A lane can remain open while still becoming operationally unreliable because transit-time promises, network rotations, and equipment turn times all become harder to trust.

#### Trade Policy & Regulatory Risk
Policy risk is secondary here, but sanctions screening, insurer exclusions, and carrier routing decisions can still create abrupt service changes. That matters most when planners assume transit times will normalize quickly.

#### Supplier & Procurement Risks
Suppliers with thin raw-material buffers or production windows tied to just-in-time ocean arrivals are the most exposed. The hidden procurement risk is not only a higher freight invoice, but a missed factory slot or line-stop cost if inbound components slip by one or two weeks.

Risk confidence: 68%`,
        check: `Longer voyages do not always translate one-for-one into higher product cost. Contract freight, annual bid cycles, and index lag can delay how fast spot-market stress shows up in a shipper's P&L.

The most overstated claims in this topic usually treat all lanes and all shippers alike. Companies with strong carrier allocations, broader supplier footprints, or flexible inventory policies often absorb disruption better than firms relying on a narrow corridor.

Challenge severity: 72%`,
        strategy: `#### Short-Term Actions (0-3 months)
1. Recalculate lead-time assumptions for any lane that would normally depend on Suez reliability.
2. Protect critical materials with temporary buffer stock where a missed arrival would stop production.
3. Review carrier routing guidance weekly instead of relying on static transit-time tables.

#### Medium-Term Strategy (3-12 months)
1. Segment SKUs by tolerance for delay and reserve premium logistics only for genuinely revenue-critical items.
2. Revisit network design for Europe-bound and Mediterranean-adjacent flows so that one corridor is not carrying all the operational risk.
3. Build freight budgeting around variability bands, not a single base-rate assumption.

#### Supplier & Sourcing Considerations
Suppliers that can ship through alternative gateways or hold regional buffer stock are strategically more valuable during route disruptions than low-cost suppliers with brittle logistics options.`,
        final: `**After full analysis:** the durable conclusion is that Red Sea disruption pressure is mainly a reliability and lead-time problem that cascades into freight, inventory, and schedule costs. The biggest mistake is focusing only on spot freight while ignoring the working-capital and service-level impact of longer, less predictable voyages.

Cost pressure is real, but it is uneven by lane, contract structure, and buffer strategy. Managers should plan for volatility and operational friction rather than assume a single headline rate explains total impact.

Overall confidence: 64%`,
        takeaway:
          "Treat this as a network-reliability issue first and a freight-rate issue second. The strongest near-term protection usually comes from better lead-time assumptions, selective buffer stock, and tighter carrier-routing visibility."
      }
    };
  }

  if (
    lower.includes("tariff") ||
    lower.includes("duty") ||
    lower.includes("duties") ||
    lower.includes("ustr") ||
    lower.includes("us-china") ||
    lower.includes("china") ||
    lower.includes("customs")
  ) {
    return {
      dashboard: {
        freightCostImpact: "Moderate",
        tariffPressure: "High",
        disruptionRisk: "Medium",
        costOutlook: "Rising"
      },
      confidence: {
        cost: 67,
        risk: 61,
        challenge: 74,
        strategy: 69,
        overall: 66,
        evidence: 62
      },
      sections: {
        cost: `#### Freight & Shipping Costs
Tariff-driven cost inflation often looks like a trade-policy issue, but freight still matters because businesses frequently reconfigure suppliers, ports, and consolidation patterns after duty changes. That can create temporary logistics inefficiency even before a new sourcing strategy settles.

#### Tariffs & Trade Duties
Tariffs hit landed cost directly and can overwhelm small savings elsewhere in the bill of materials. The highest exposure is usually in categories where supplier alternatives are limited, qualification cycles are long, or customs classification leaves little room to redesign the product mix.

#### Other SCM Cost Factors
Secondary effects often include supplier-switching expense, engineering validation, customs brokerage complexity, and inventory builds ahead of policy deadlines. Currency moves can either cushion or amplify the duty shock.

#### Cost Impact Summary Table
| Cost Factor | Current Level | Direction | Impact on Product Cost |
| Import duty | Policy driven | Up | Direct increase to landed cost |
| Supplier transition cost | Elevated | Up | Requalification and onboarding expense |
| Freight and routing | Mixed | Neutral | Can rise during sourcing shifts |
| Inventory timing | Tactical | Up | Front-loading orders ties up cash |

Data confidence: 67%`,
        risk: `#### Active Disruptions
Tariff announcements can behave like a demand shock because buyers often pull orders forward. That can distort bookings, port flows, and supplier capacity even before the policy fully lands in invoices.

#### Trade Policy & Regulatory Risk
The highest risk is policy volatility. Classification disputes, exclusions, retaliatory measures, and sudden scope changes can make an apparently manageable tariff problem much harder to hedge.

#### Supplier & Procurement Risks
Single-country concentration becomes more expensive when tariffs widen the gap between nominal ex-works cost and true landed cost. Procurement teams also face a sequencing risk: switching too slowly preserves duty exposure, but switching too fast can create quality or continuity issues.

Risk confidence: 61%`,
        check: `Tariff commentary is often overstated when it assumes every percentage point of duty flows directly into end-product margin loss. Some firms offset part of the impact through supplier negotiations, engineering changes, transfer-pricing adjustments, or mix shifts.

The opposite mistake is underestimating the transition cost of moving supply. Alternative sourcing is rarely free, and the first year can include validation spend, scrap, slower yield ramps, and weaker purchasing leverage.

Challenge severity: 74%`,
        strategy: `#### Short-Term Actions (0-3 months)
1. Rebuild landed-cost models at the tariff-line level instead of using blended averages.
2. Identify SKUs where classification review, exemption logic, or alternative country-of-origin strategies materially change duty exposure.
3. Protect critical items with dual planning scenarios for both current and escalated tariff regimes.

#### Medium-Term Strategy (3-12 months)
1. Diversify manufacturing footprints where duty exposure is structurally eroding gross margin.
2. Pair sourcing shifts with engineering and quality resources early so the procurement timeline is realistic.
3. Treat tariff resilience as a network-design input, not a one-off sourcing exercise.

#### Supplier & Sourcing Considerations
The best supplier option is often not the lowest unit price. Favor suppliers that improve country diversification, customs clarity, and continuity of supply even if the opening quote is slightly higher.`,
        final: `**After full analysis:** tariffs usually matter most when they change the economics of sourcing concentration, not just when they lift a single invoice. The strongest conclusion is that duty pressure should be modeled together with supplier-switching cost, not in isolation.

What holds up under scrutiny is the direct landed-cost pressure. What needs caution is any simplistic claim that a country shift will neutralize the problem immediately without transitional cost or operational risk.

Overall confidence: 66%`,
        takeaway:
          "Model tariff exposure at the SKU and supplier level, then compare that against the real cost and lead-time of moving production. The cheapest quote often stops being the cheapest option once duty, transition risk, and continuity are included."
      }
    };
  }

  if (
    lower.includes("freight") ||
    lower.includes("container") ||
    lower.includes("shipping rate") ||
    lower.includes("asia to europe") ||
    lower.includes("transpacific") ||
    lower.includes("ocean")
  ) {
    return {
      dashboard: {
        freightCostImpact: "Volatile",
        tariffPressure: "Low",
        disruptionRisk: "Medium",
        costOutlook: "Mixed"
      },
      confidence: {
        cost: 61,
        risk: 58,
        challenge: 70,
        strategy: 64,
        overall: 60,
        evidence: 56
      },
      sections: {
        cost: `#### Freight & Shipping Costs
Container-rate discussions need two views at once: spot indicators and actual shipper contract exposure. Even when indices move sharply, the cost transmission into product margins depends on contract timing, allocation strength, and how much volume is moving under fixed agreements versus spot bookings.

#### Tariffs & Trade Duties
Tariffs are usually a side issue unless the freight question is tied to a specific trade lane that is also under policy pressure. For a pure rate question, transport dynamics dominate.

#### Other SCM Cost Factors
Peak-season surcharges, inland drayage, chassis shortages, detention, and schedule unreliability often matter as much as the headline ocean base rate. Lead-time variability can force earlier ordering and higher inventory coverage.

#### Cost Impact Summary Table
| Cost Factor | Current Level | Direction | Impact on Product Cost |
| Ocean base rate | Market driven | Mixed | Variable landed-cost sensitivity |
| Surcharges and accessorials | Sticky | Up | Often persist after spot rates cool |
| Inland logistics | Localized | Mixed | Port and rail performance matter |
| Inventory buffer | Operational | Up | Higher variability requires more stock |

Data confidence: 61%`,
        risk: `#### Active Disruptions
Freight risk depends on whether tightness is driven by a temporary event or a network-wide capacity imbalance. Route-specific disruption can lift one corridor while another softens, so broad statements about "container rates" are often misleading.

#### Trade Policy & Regulatory Risk
Policy exposure is usually moderate unless freight demand is being distorted by pre-tariff buying, sanctions, or customs-related rerouting.

#### Supplier & Procurement Risks
Procurement teams are exposed when supplier agreements assume transit consistency that carriers cannot maintain. Even modest schedule slippage can create higher expedite spend at the destination side.

Risk confidence: 58%`,
        check: `The most common mistake is treating public freight indices as if they were the exact rate on the invoice. Many shippers are partially insulated by annual contracts, while others pay more than the headline benchmark once add-ons and inland costs are included.

Another missing factor is product density. Freight swings matter much more for low-value, bulky goods than for high-value electronics or components with a small logistics cost share.

Challenge severity: 70%`,
        strategy: `#### Short-Term Actions (0-3 months)
1. Separate ocean base-rate exposure from accessorial and inland cost exposure.
2. Track spot indicators, but reconcile them against contract performance and actual invoice data every month.
3. Prioritize routing options that improve schedule reliability for critical SKUs, not just nominal rate.

#### Medium-Term Strategy (3-12 months)
1. Rebid freight with scenario clauses that account for volatility rather than locking budget assumptions to one quarter's spot environment.
2. Match service levels to product economics so low-margin items are not absorbing premium transport by default.
3. Improve lane-level visibility from origin booking through inland delivery.

#### Supplier & Sourcing Considerations
Suppliers with flexible consolidation, booking discipline, and multiple gateway options can reduce total freight exposure more than a supplier with a slightly lower ex-works price.`,
        final: `**After full analysis:** freight-rate pressure should be judged lane by lane and contract by contract. The durable insight is that the invoice impact is usually driven by the combination of base rates, surcharge behavior, and reliability, not by the headline index alone.

What survives scrutiny is the need to translate market indicators into product-level economics. What remains uncertain without live data is the exact current direction and magnitude of those moves.

Overall confidence: 60%`,
        takeaway:
          "Do not budget from a freight index alone. Convert lane volatility into SKU-level landed cost and service-risk assumptions so transport choices match product margins and replenishment urgency."
      }
    };
  }

  if (
    lower.includes("fuel surcharge") ||
    lower.includes("bunker") ||
    lower.includes("diesel") ||
    lower.includes("jet fuel") ||
    lower.includes("energy")
  ) {
    return {
      dashboard: {
        freightCostImpact: "Moderate",
        tariffPressure: "Low",
        disruptionRisk: "Medium",
        costOutlook: "Rising"
      },
      confidence: {
        cost: 64,
        risk: 57,
        challenge: 71,
        strategy: 65,
        overall: 62,
        evidence: 58
      },
      sections: {
        cost: `#### Freight & Shipping Costs
Fuel surcharges are a pass-through mechanism, but they rarely move through the supply chain cleanly. Depending on carrier contracts, surcharge formulas, and review cycles, the customer can see delayed, partial, or layered cost changes rather than a simple one-step adjustment.

#### Tariffs & Trade Duties
Tariffs usually do not drive a fuel-surcharge question directly. The relevant interaction is that duty-heavy supply chains have less room to absorb transport inflation elsewhere.

#### Other SCM Cost Factors
Fuel volatility can raise trucking, ocean, and air costs at the same time. That compounds with route inefficiency, congestion, or low asset utilization. The downstream effect is especially visible when companies respond with rush shipments or network imbalances.

#### Cost Impact Summary Table
| Cost Factor | Current Level | Direction | Impact on Product Cost |
| Fuel surcharge | Formula based | Up | Raises transport spend as carriers reprice |
| Mode switching | Contingent | Up | Expedites magnify energy sensitivity |
| Network efficiency | Operational | Mixed | Poor routing increases fuel exposure |
| Inventory timing | Secondary | Up | Delays can trigger premium freight |

Data confidence: 64%`,
        risk: `#### Active Disruptions
Fuel itself is not always the disruption; volatility is. The risk comes from budgeting with stale surcharge assumptions while carrier reviews reset more quickly than procurement budgets do.

#### Trade Policy & Regulatory Risk
Environmental rules, fuel standards, and regional compliance regimes can change surcharge structures or carrier cost recovery behavior over time.

#### Supplier & Procurement Risks
Suppliers far from demand centers or dependent on expedited replenishment are more exposed to fuel-driven inflation than suppliers shipping dense, high-value goods on stable schedules.

Risk confidence: 57%`,
        check: `Fuel surcharges are often overstated when teams assume every transport dollar moves with the oil market. In reality, formulas differ by mode and provider, and some contracts cap or smooth the changes.

What is often understated is behavioral response. If schedule instability causes teams to upgrade service levels, the cost escalation can exceed the direct surcharge effect itself.

Challenge severity: 71%`,
        strategy: `#### Short-Term Actions (0-3 months)
1. Audit surcharge clauses by carrier and mode instead of relying on blended transport assumptions.
2. Identify where avoidable expedites are amplifying energy sensitivity.
3. Reforecast freight budgets using a range of fuel scenarios rather than a single point estimate.

#### Medium-Term Strategy (3-12 months)
1. Improve load planning and modal discipline so network inefficiency does not magnify surcharge exposure.
2. Negotiate clearer surcharge transparency in carrier agreements.
3. Redesign replenishment cycles for products that repeatedly fall into premium transport.

#### Supplier & Sourcing Considerations
Shorter supply lines and suppliers with more predictable planning windows usually reduce effective fuel exposure more than after-the-fact freight negotiations do.`,
        final: `**After full analysis:** fuel surcharges matter most when they sit on top of planning instability. The clearest conclusion is that the surcharge itself is only part of the cost story; the larger swing often comes from network behavior that forces premium transport.

The durable action is to reduce avoidable urgency in the system while keeping surcharge formulas transparent and auditable.

Overall confidence: 62%`,
        takeaway:
          "Treat fuel as a volatility multiplier. The best defense is usually better planning discipline, fewer emergency shipments, and tighter carrier surcharge visibility rather than assuming a fixed transport budget will hold."
      }
    };
  }

  return {
    dashboard: {
      freightCostImpact: "Moderate",
      tariffPressure: "Medium",
      disruptionRisk: "Medium",
      costOutlook: "Mixed"
    },
    confidence: {
      cost: 58,
      risk: 57,
      challenge: 69,
      strategy: 63,
      overall: 59,
      evidence: 54
    },
    sections: {
      cost: `#### Freight & Shipping Costs
Most supply-chain cost questions are influenced by a mix of transport pricing, schedule reliability, and how much buffer a company needs to carry to protect service levels. Freight is often the visible line item, but the larger business impact can come from variability rather than the base rate itself.

#### Tariffs & Trade Duties
Trade-policy pressure matters when duties, export controls, or origin rules change sourcing economics. Even if the headline tariff impact seems manageable, compliance and supplier-switching costs can materially alter landed cost.

#### Other SCM Cost Factors
Inventory carrying cost, lead-time inflation, insurance, congestion, and supplier concentration often explain why apparently small disruptions become margin problems. Working-capital drag is easy to miss in early analysis.

#### Cost Impact Summary Table
| Cost Factor | Current Level | Direction | Impact on Product Cost |
| Transport | Variable | Mixed | Depends on lane and service level |
| Trade policy | Uneven | Mixed | Can change landed cost directly |
| Inventory | Elevated sensitivity | Up | Buffer stock ties up cash |
| Supplier risk | Context dependent | Mixed | Concentration amplifies disruption |

Data confidence: 58%`,
      risk: `#### Active Disruptions
The right risk view depends on whether the issue is cyclical, geopolitical, regulatory, or supplier-specific. A resilient plan needs to separate short-term noise from structural exposure.

#### Trade Policy & Regulatory Risk
Policy shifts can change cost and continuity faster than annual sourcing cycles can adapt. That is why scenario planning matters even when no immediate rule change has landed yet.

#### Supplier & Procurement Risks
Single-source suppliers, long qualification cycles, and poor visibility into tier-two materials often create the highest hidden risk. Procurement resilience depends as much on optionality as on price.

Risk confidence: 57%`,
      check: `Early supply-chain analysis often overweights the most visible headline and underweights second-order costs such as inventory, service failures, and change-management effort. Those hidden costs can dominate after the first few weeks.

It is also easy to overgeneralize from market commentary that is true for one sector or lane but not for another. Product value density, contractual freight protection, and supplier flexibility all matter.

Challenge severity: 69%`,
      strategy: `#### Short-Term Actions (0-3 months)
1. Rebuild the issue into a landed-cost model that includes freight, duty, lead time, and inventory impact.
2. Separate critical SKUs from replaceable ones so mitigation spend is targeted.
3. Review planning assumptions weekly while the situation is still moving.

#### Medium-Term Strategy (3-12 months)
1. Add sourcing and logistics optionality where one lane, supplier, or country dominates exposure.
2. Budget around ranges and triggers, not single-point assumptions.
3. Improve visibility from supplier commitment through delivered inventory.

#### Supplier & Sourcing Considerations
The best long-term hedge is usually a combination of qualified alternatives, clearer lead-time visibility, and procurement decisions that reward resilience alongside nominal price.`,
      final: `**After full analysis:** the dependable conclusion is that supply-chain cost pressure rarely comes from one line item alone. Transport, policy, and inventory behavior reinforce each other, so the right response is a cross-functional one rather than a narrow freight or sourcing fix.

What holds up best is the need to translate disruption into landed cost and service-risk scenarios. What remains uncertain without live data is the exact current intensity of each driver.

Overall confidence: 59%`,
      takeaway:
        "Turn the question into a landed-cost and continuity model, not a headline debate. The strongest decisions usually come from comparing supplier optionality, transport risk, and inventory tradeoffs in one view."
    }
  };
}

export function buildFallbackAnalysis(
  query: string,
  options: FallbackOptions = {}
): ScmAnalysisResponse {
  const scenario = detectScenario(query);
  const mode = options.mode ?? "offline";
  const notices = options.notice ? [options.notice] : [];
  const generatedAt = new Date().toISOString();

  return {
    query,
    mode,
    dashboard: scenario.dashboard,
    stats: {
      articlesFound: 0,
      credibleSources: 0,
      disputedClaims: 1
    },
    publications: [],
    sources: [],
    sourceSummary:
      mode === "knowledge"
        ? "This answer uses non-web model reasoning, so it avoids article-level sourcing."
        : "This fallback summary is built from deterministic supply-chain playbooks rather than live web research.",
    notices,
    confidence: {
      cost: clamp(scenario.confidence.cost, 45, 90),
      risk: clamp(scenario.confidence.risk, 45, 90),
      challenge: clamp(scenario.confidence.challenge, 45, 90),
      strategy: clamp(scenario.confidence.strategy, 45, 90),
      overall: clamp(scenario.confidence.overall, 45, 90),
      evidence: clamp(scenario.confidence.evidence, 45, 90)
    },
    sections: scenario.sections,
    footnote:
      options.footnote ??
      (mode === "knowledge"
        ? "Knowledge mode: live web search was unavailable, so the app used non-web analysis."
        : "Fallback mode: live provider access was unavailable, so the app used a local supply-chain playbook."),
    generatedAt,
    quotaResetAt: options.quotaResetAt
  };
}
