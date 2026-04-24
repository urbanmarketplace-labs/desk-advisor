import { productCatalogEntries, type ProductCatalogKey } from "@/lib/productCatalog";
import type {
  AssessmentInput,
  Confidence,
  ConstraintKey,
  DetailDepth,
  DiagnosisIssue,
  DiagnosisResult,
  DiagnosisSubScore,
  InferredConstraint,
  InputQuality,
  MatchedProduct,
  ProductCategory,
  ResolvedTradeOff,
  ScoreImprovement,
  ScoreKey,
  SignalKey,
  WorkspaceSignal
} from "@/types/assessment";

type SignalDraft = Omit<WorkspaceSignal, "intensity" | "confidence"> & {
  intensity: number;
  confidence: number;
};

interface SignalInput {
  key: SignalKey;
  label: string;
  intensity: number;
  confidence?: number;
  source: string;
  evidence: string;
}

interface SignalModel {
  signals: WorkspaceSignal[];
  baseConfidence: number;
  inputQuality: InputQuality;
  depth: DetailDepth;
  confidence: Confidence;
  confidenceLabel: string;
  inputQualityLabel: string;
  inputQualityNote: string;
  moreDetailPrompt: string | null;
}

interface ProductProfile {
  category: ProductCategory;
  spaceImpact: "low" | "medium" | "high";
  styleFit: "utility" | "clean" | "premium";
}

const subScoreLabels: Record<ScoreKey, string> = {
  comfort: "Comfort / ergonomics",
  focus: "Focus / visual clarity",
  lighting: "Lighting / visual quality",
  fit: "Space & fit"
};

const signalLabels: Record<SignalKey, string> = {
  ergonomics_risk: "Ergonomics risk",
  visual_noise: "Visual noise",
  lighting_quality: "Lighting quality",
  desk_pressure: "Desk pressure",
  session_intensity: "Session intensity",
  setup_complexity: "Setup complexity",
  upgrade_readiness: "Upgrade readiness",
  focus_fragility: "Focus fragility"
};

const structuralOrder: ConstraintKey[] = ["ergonomics", "lighting", "space", "focus", "finish"];

const productProfiles: Record<ProductCatalogKey, ProductProfile> = {
  lumomist_diffuser: {
    category: "wellbeing",
    spaceImpact: "low",
    styleFit: "premium"
  },
  charging_station: {
    category: "organization",
    spaceImpact: "low",
    styleFit: "clean"
  },
  leather_desk_mat: {
    category: "surface",
    spaceImpact: "medium",
    styleFit: "premium"
  },
  wooden_tablet_stand: {
    category: "organization",
    spaceImpact: "low",
    styleFit: "clean"
  },
  monitor_light_bar: {
    category: "lighting",
    spaceImpact: "low",
    styleFit: "clean"
  },
  monitor_stand: {
    category: "ergonomics",
    spaceImpact: "medium",
    styleFit: "clean"
  },
  adjustable_laptop_stand: {
    category: "ergonomics",
    spaceImpact: "low",
    styleFit: "clean"
  },
  wooden_laptop_stand: {
    category: "ergonomics",
    spaceImpact: "low",
    styleFit: "premium"
  },
  cable_management: {
    category: "organization",
    spaceImpact: "low",
    styleFit: "utility"
  },
  headphone_stand: {
    category: "organization",
    spaceImpact: "low",
    styleFit: "clean"
  }
};

const primaryProductBoosts: Record<ConstraintKey, ProductCatalogKey[]> = {
  ergonomics: ["adjustable_laptop_stand", "wooden_laptop_stand", "monitor_stand"],
  lighting: ["monitor_light_bar"],
  space: ["cable_management", "charging_station", "headphone_stand", "monitor_stand"],
  focus: ["cable_management", "charging_station", "leather_desk_mat", "headphone_stand"],
  finish: ["leather_desk_mat", "lumomist_diffuser", "wooden_tablet_stand", "wooden_laptop_stand"]
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return Math.round(Math.max(24, Math.min(96, value)));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function detailKeywordCount(detail: string): number {
  const matches = detail.match(/\b(neck|back|wrist|shoulder|strain|pain|glare|shadow|dim|light|lighting|cable|clutter|focus|space|small|storage|monitor|laptop|keyboard|mouse|desk|calls|meetings|editing|design|window|afternoon|night)\b/gi);
  return matches ? unique(matches.map((match) => match.toLowerCase())).length : 0;
}

function answeredOptionalCount(input: AssessmentInput): number {
  return [input.screenPosition, input.inputDevices, input.surfaceUse, input.lightTiming, input.focusPattern]
    .filter(Boolean).length;
}

function addSignal(drafts: Map<SignalKey, SignalDraft>, signal: SignalInput): void {
  const existing = drafts.get(signal.key);
  const confidence = signal.confidence ?? 0.74;

  if (!existing) {
    drafts.set(signal.key, {
      key: signal.key,
      label: signal.label,
      intensity: clamp(signal.intensity),
      confidence: clamp(confidence),
      sources: [signal.source],
      evidence: [signal.evidence]
    });
    return;
  }

  existing.intensity = clamp(Math.max(existing.intensity, signal.intensity) + Math.min(existing.intensity, signal.intensity) * 0.18);
  existing.confidence = clamp((existing.confidence + confidence) / 2 + 0.06);
  existing.sources = unique([...existing.sources, signal.source]);
  existing.evidence = unique([...existing.evidence, signal.evidence]);
}

function getSignal(signals: WorkspaceSignal[], key: SignalKey): WorkspaceSignal | undefined {
  return signals.find((signal) => signal.key === key);
}

function signalValue(signals: WorkspaceSignal[], key: SignalKey): number {
  return getSignal(signals, key)?.intensity ?? 0;
}

function buildSignalLayer(input: AssessmentInput): SignalModel {
  const drafts = new Map<SignalKey, SignalDraft>();
  const detail = input.extraDetail.trim();
  const keywordCount = detailKeywordCount(detail);
  const optionalAnswers = answeredOptionalCount(input);

  const sourceConfidence = detail.length >= 90 ? 0.95 : detail.length >= 40 ? 0.86 : 0.74;

  if (input.timeExposure === "Under 2 hours") {
    addSignal(drafts, { key: "session_intensity", label: signalLabels.session_intensity, intensity: 0.2, confidence: 0.8, source: "Daily desk time", evidence: "Short daily desk use lowers exposure risk." });
  }
  if (input.timeExposure === "2-4 hours") {
    addSignal(drafts, { key: "session_intensity", label: signalLabels.session_intensity, intensity: 0.42, confidence: 0.82, source: "Daily desk time", evidence: "Moderate desk use makes repeated friction relevant." });
  }
  if (input.timeExposure === "4-8 hours") {
    addSignal(drafts, { key: "session_intensity", label: signalLabels.session_intensity, intensity: 0.72, confidence: 0.88, source: "Daily desk time", evidence: "Long sessions raise the cost of comfort and lighting problems." });
  }
  if (input.timeExposure === "8+ hours") {
    addSignal(drafts, { key: "session_intensity", label: signalLabels.session_intensity, intensity: 0.92, confidence: 0.9, source: "Daily desk time", evidence: "Very long desk use makes small setup problems compound." });
  }

  if (input.setupType === "Laptop only") {
    addSignal(drafts, { key: "ergonomics_risk", label: signalLabels.ergonomics_risk, intensity: 0.78, confidence: 0.78, source: "Setup type", evidence: "Laptop-only work often means looking down into the screen." });
    addSignal(drafts, { key: "setup_complexity", label: signalLabels.setup_complexity, intensity: 0.32, confidence: 0.8, source: "Setup type", evidence: "A simple setup has fewer parts but less adjustability." });
  }
  if (input.setupType === "Dual monitor") {
    addSignal(drafts, { key: "setup_complexity", label: signalLabels.setup_complexity, intensity: 0.82, confidence: 0.86, source: "Setup type", evidence: "Dual monitors add screen spread, cable load, and layout complexity." });
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.62, confidence: 0.78, source: "Setup type", evidence: "Two displays compete for surface and visual space." });
  }
  if (input.setupType === "Laptop + external monitor") {
    addSignal(drafts, { key: "setup_complexity", label: signalLabels.setup_complexity, intensity: 0.55, confidence: 0.8, source: "Setup type", evidence: "Laptop plus monitor gives more flexibility but adds layout choices." });
  }

  if (input.frictionSignals.includes("Discomfort / strain")) {
    addSignal(drafts, { key: "ergonomics_risk", label: signalLabels.ergonomics_risk, intensity: 0.86, confidence: 0.9, source: "Friction signal", evidence: "You selected discomfort or strain." });
  }
  if (input.frictionSignals.includes("Low light / poor visibility")) {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.82, confidence: 0.88, source: "Friction signal", evidence: "You selected low light or poor visibility." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.48, confidence: 0.72, source: "Friction signal", evidence: "Poor visibility often drains focus." });
  }
  if (input.frictionSignals.includes("Clutter / visual noise")) {
    addSignal(drafts, { key: "visual_noise", label: signalLabels.visual_noise, intensity: 0.84, confidence: 0.88, source: "Friction signal", evidence: "You selected clutter or visual noise." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.62, confidence: 0.82, source: "Friction signal", evidence: "Visual noise competes with attention." });
  }
  if (input.frictionSignals.includes("Space feels limited")) {
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.82, confidence: 0.88, source: "Friction signal", evidence: "You selected limited space." });
  }
  if (input.frictionSignals.includes("Hard to focus")) {
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.78, confidence: 0.86, source: "Friction signal", evidence: "You selected hard to focus." });
  }
  if (input.frictionSignals.includes("Setup feels flat / unfinished")) {
    addSignal(drafts, { key: "upgrade_readiness", label: signalLabels.upgrade_readiness, intensity: 0.56, confidence: 0.72, source: "Friction signal", evidence: "You selected flat or unfinished feel." });
  }

  if (input.deskDensity === "Busy") {
    addSignal(drafts, { key: "visual_noise", label: signalLabels.visual_noise, intensity: 0.64, confidence: 0.84, source: "Desk density", evidence: "The desk feels busy." });
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.58, confidence: 0.8, source: "Desk density", evidence: "A busy surface leaves less working room." });
  }
  if (input.deskDensity === "Overloaded") {
    addSignal(drafts, { key: "visual_noise", label: signalLabels.visual_noise, intensity: 0.88, confidence: 0.88, source: "Desk density", evidence: "The desk feels overloaded." });
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.86, confidence: 0.88, source: "Desk density", evidence: "An overloaded surface reduces usable desk area." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.58, confidence: 0.75, source: "Desk density", evidence: "Overload makes the desk harder to read quickly." });
  }

  if (input.lightingQuality === "Dim / shadowy") {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.88, confidence: 0.9, source: "Lighting quality", evidence: "Lighting is dim or shadowy." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.5, confidence: 0.76, source: "Lighting quality", evidence: "Dim light makes visual work heavier." });
  }
  if (input.lightingQuality === "Changes throughout the day") {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.72, confidence: 0.86, source: "Lighting quality", evidence: "Lighting changes through the day." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.42, confidence: 0.72, source: "Lighting quality", evidence: "Changing light makes the setup less reliable." });
  }
  if (input.lightingQuality === "Bright and even") {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.12, confidence: 0.88, source: "Lighting quality", evidence: "Lighting is bright and even." });
  }

  if (input.deskSize === "Very small") {
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.82, confidence: 0.86, source: "Desk size", evidence: "Very small desks have little tolerance for extra objects." });
  }
  if (input.deskSize === "Small") {
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.62, confidence: 0.84, source: "Desk size", evidence: "Small desks need tighter surface discipline." });
  }

  if (input.screenPosition === "Below eye level") {
    addSignal(drafts, { key: "ergonomics_risk", label: signalLabels.ergonomics_risk, intensity: 0.9, confidence: 0.95, source: "Screen position", evidence: "The screen is below eye level." });
  }
  if (input.inputDevices === "Built-in laptop keyboard / trackpad") {
    addSignal(drafts, { key: "ergonomics_risk", label: signalLabels.ergonomics_risk, intensity: 0.76, confidence: 0.92, source: "Input devices", evidence: "Built-in laptop input keeps screen and hands tied together." });
  }
  if (input.surfaceUse === "Storage spills onto the desk" || input.surfaceUse === "Work tools and personal items compete") {
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.88, confidence: 0.94, source: "Surface use", evidence: "Storage or competing items are taking over the work surface." });
    addSignal(drafts, { key: "visual_noise", label: signalLabels.visual_noise, intensity: 0.68, confidence: 0.88, source: "Surface use", evidence: "Non-work items are adding visible load." });
  }
  if (input.lightTiming && input.lightTiming !== "Consistent all day" && input.lightTiming !== "Not sure") {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.78, confidence: 0.92, source: "Light timing", evidence: `Lighting is weakest ${input.lightTiming.toLowerCase().replace("worse ", "")}.` });
  }
  if (input.focusPattern === "I lose focus when the desk looks busy") {
    addSignal(drafts, { key: "visual_noise", label: signalLabels.visual_noise, intensity: 0.86, confidence: 0.94, source: "Focus pattern", evidence: "Focus drops when the desk looks busy." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.84, confidence: 0.94, source: "Focus pattern", evidence: "Visual busyness is a direct focus trigger." });
  }
  if (input.focusPattern === "I lose focus when lighting changes") {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.8, confidence: 0.94, source: "Focus pattern", evidence: "Focus drops when lighting changes." });
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.72, confidence: 0.9, source: "Focus pattern", evidence: "Lighting instability is affecting attention." });
  }
  if (input.focusPattern === "I lose focus during long sessions") {
    addSignal(drafts, { key: "focus_fragility", label: signalLabels.focus_fragility, intensity: 0.66, confidence: 0.88, source: "Focus pattern", evidence: "Long sessions are when focus breaks down." });
  }

  if (input.whatMattersMost === "More premium feel" || input.whatMattersMost === "Cleaner look") {
    addSignal(drafts, { key: "upgrade_readiness", label: signalLabels.upgrade_readiness, intensity: input.whatMattersMost === "More premium feel" ? 0.7 : 0.55, confidence: 0.76, source: "User priority", evidence: `You want ${input.whatMattersMost.toLowerCase()}.` });
  }
  if (input.upgradeIntent === "Open to bigger changes") {
    addSignal(drafts, { key: "upgrade_readiness", label: signalLabels.upgrade_readiness, intensity: 0.82, confidence: 0.82, source: "Upgrade intent", evidence: "You are open to bigger changes." });
  }
  if (input.upgradeIntent === "Free improvements first") {
    addSignal(drafts, { key: "upgrade_readiness", label: signalLabels.upgrade_readiness, intensity: 0.22, confidence: 0.86, source: "Upgrade intent", evidence: "You prefer free improvements first." });
  }

  if (/\b(neck|back|wrist|shoulder|strain|ache|pain|tight)\b/i.test(detail)) {
    addSignal(drafts, { key: "ergonomics_risk", label: signalLabels.ergonomics_risk, intensity: 0.9, confidence: sourceConfidence, source: "Setup note", evidence: "Your note mentions physical strain." });
  }
  if (/\b(light|lighting|glare|shadow|dark|dim|window|afternoon|evening|night)\b/i.test(detail)) {
    addSignal(drafts, { key: "lighting_quality", label: signalLabels.lighting_quality, intensity: 0.78, confidence: sourceConfidence, source: "Setup note", evidence: "Your note mentions lighting conditions." });
  }
  if (/\b(clutter|cable|wire|mess|busy|noise|stuff)\b/i.test(detail)) {
    addSignal(drafts, { key: "visual_noise", label: signalLabels.visual_noise, intensity: 0.8, confidence: sourceConfidence, source: "Setup note", evidence: "Your note mentions clutter or visible mess." });
  }
  if (/\b(storage|drawer|shelf|paper|equipment|printer|speaker|small|tight|limited)\b/i.test(detail)) {
    addSignal(drafts, { key: "desk_pressure", label: signalLabels.desk_pressure, intensity: 0.76, confidence: sourceConfidence, source: "Setup note", evidence: "Your note mentions space or storage pressure." });
  }

  const signals = [...drafts.values()].map((signal) => ({
    ...signal,
    intensity: Number(clamp(signal.intensity).toFixed(2)),
    confidence: Number(clamp(signal.confidence).toFixed(2)),
    sources: unique(signal.sources),
    evidence: unique(signal.evidence).slice(0, 3)
  }));

  const requiredAnswered = [
    input.setupType,
    input.timeExposure,
    input.frictionSignals.length > 0 ? "friction" : "",
    input.deskDensity,
    input.lightingQuality,
    input.whatMattersMost,
    input.workStyle,
    input.deskSize,
    input.upgradeIntent
  ].filter(Boolean).length;

  const consistency = signals.length === 0
    ? 0.35
    : signals.filter((signal) => signal.intensity > 0.55 && signal.confidence > 0.78).length / Math.max(3, signals.length);
  const depthScore = clamp((requiredAnswered / 9) * 0.42 + Math.min(optionalAnswers, 5) * 0.08 + Math.min(keywordCount, 5) * 0.06 + (detail.length >= 60 ? 0.12 : 0));
  const baseConfidence = clamp(0.32 + depthScore * 0.48 + consistency * 0.2);

  if (baseConfidence < 0.58) {
    return {
      signals,
      baseConfidence,
      confidence: "low",
      confidenceLabel: "Low confidence",
      inputQuality: "light",
      inputQualityLabel: "Light diagnosis",
      inputQualityNote: "This is based on core answers and limited context. The read stays cautious.",
      moreDetailPrompt: "Add one detail about discomfort, desk size, lighting changes, or what your workday involves for a sharper diagnosis.",
      depth: "short"
    };
  }

  if (baseConfidence < 0.78) {
    return {
      signals,
      baseConfidence,
      confidence: "moderate",
      confidenceLabel: "Moderate confidence",
      inputQuality: "moderate",
      inputQualityLabel: "Moderate detail",
      inputQualityNote: "The main pattern is clear, but a few specifics are still inferred.",
      moreDetailPrompt: detail.length === 0 ? "A short note about your setup would make the next read more precise." : null,
      depth: "medium"
    };
  }

  return {
    signals,
    baseConfidence,
    confidence: "high",
    confidenceLabel: "High confidence",
    inputQuality: "rich",
    inputQualityLabel: "Rich diagnosis",
    inputQualityNote: "There is enough signal to prioritise with more certainty.",
    moreDetailPrompt: null,
    depth: "deep"
  };
}

function constraintScore(severity: number, confidence: number, multiplier = 1): number {
  return Number((severity * (0.7 + confidence * 0.3) * multiplier).toFixed(2));
}

function inferConstraints(input: AssessmentInput, model: SignalModel): InferredConstraint[] {
  const signals = model.signals;
  const ergonomics = signalValue(signals, "ergonomics_risk");
  const session = signalValue(signals, "session_intensity");
  const lighting = signalValue(signals, "lighting_quality");
  const pressure = signalValue(signals, "desk_pressure");
  const noise = signalValue(signals, "visual_noise");
  const focus = signalValue(signals, "focus_fragility");
  const complexity = signalValue(signals, "setup_complexity");
  const upgrade = signalValue(signals, "upgrade_readiness");

  const constraints: InferredConstraint[] = [];

  const ergonomicsSeverity = clamp(ergonomics * 0.72 + session * 0.2 + (input.setupType === "Laptop only" ? 0.12 : 0));
  if (ergonomicsSeverity > 0.32) {
    constraints.push({
      key: "ergonomics",
      label: "Comfort and posture",
      scoreKey: "comfort",
      severity: ergonomicsSeverity,
      confidence: getSignal(signals, "ergonomics_risk")?.confidence ?? model.baseConfidence,
      priority: constraintScore(ergonomicsSeverity, model.baseConfidence, 1.28),
      why: input.setupType === "Laptop only"
        ? "Laptop work and desk time point to screen-height strain."
        : "Comfort signals are strong enough to treat posture as a core constraint.",
      evidence: unique([...(getSignal(signals, "ergonomics_risk")?.evidence ?? []), ...(getSignal(signals, "session_intensity")?.evidence ?? [])]).slice(0, 3),
      sourceSignals: ["ergonomics_risk", "session_intensity"],
      structural: true
    });
  }

  const lightingSeverity = clamp(lighting * 0.78 + session * 0.12 + focus * 0.1);
  if (lightingSeverity > 0.3) {
    constraints.push({
      key: "lighting",
      label: "Lighting reliability",
      scoreKey: "lighting",
      severity: lightingSeverity,
      confidence: getSignal(signals, "lighting_quality")?.confidence ?? model.baseConfidence,
      priority: constraintScore(lightingSeverity, model.baseConfidence, 1.14),
      why: "Lighting is affecting visibility and the amount of effort it takes to stay visually comfortable.",
      evidence: unique([...(getSignal(signals, "lighting_quality")?.evidence ?? []), ...(getSignal(signals, "focus_fragility")?.evidence ?? [])]).slice(0, 3),
      sourceSignals: ["lighting_quality", "focus_fragility"],
      structural: true
    });
  }

  const spaceSeverity = clamp(pressure * 0.72 + complexity * 0.16 + noise * 0.12);
  if (spaceSeverity > 0.34) {
    constraints.push({
      key: "space",
      label: "Space and surface pressure",
      scoreKey: "fit",
      severity: spaceSeverity,
      confidence: Math.max(getSignal(signals, "desk_pressure")?.confidence ?? 0, getSignal(signals, "setup_complexity")?.confidence ?? 0, model.baseConfidence),
      priority: constraintScore(spaceSeverity, model.baseConfidence, 1.12),
      why: "Tools, screens, or storage are competing for the same working surface.",
      evidence: unique([...(getSignal(signals, "desk_pressure")?.evidence ?? []), ...(getSignal(signals, "setup_complexity")?.evidence ?? [])]).slice(0, 3),
      sourceSignals: ["desk_pressure", "setup_complexity", "visual_noise"],
      structural: true
    });
  }

  const focusSeverity = clamp(focus * 0.54 + noise * 0.28 + lighting * 0.1 + pressure * 0.08);
  if (focusSeverity > 0.32) {
    constraints.push({
      key: "focus",
      label: "Focus and visual clarity",
      scoreKey: "focus",
      severity: focusSeverity,
      confidence: Math.max(getSignal(signals, "focus_fragility")?.confidence ?? 0, getSignal(signals, "visual_noise")?.confidence ?? 0, model.baseConfidence),
      priority: constraintScore(focusSeverity, model.baseConfidence, 1),
      why: "The desk is creating attention drag through visual noise, lighting instability, or overloaded layout.",
      evidence: unique([...(getSignal(signals, "focus_fragility")?.evidence ?? []), ...(getSignal(signals, "visual_noise")?.evidence ?? [])]).slice(0, 3),
      sourceSignals: ["focus_fragility", "visual_noise", "lighting_quality"],
      structural: false
    });
  }

  const finishSeverity = clamp(upgrade * 0.58 + (input.whatMattersMost === "More premium feel" ? 0.22 : 0) + (input.whatMattersMost === "Cleaner look" ? 0.12 : 0));
  if (finishSeverity > 0.28) {
    constraints.push({
      key: "finish",
      label: "Finish and visual polish",
      scoreKey: "fit",
      severity: finishSeverity,
      confidence: getSignal(signals, "upgrade_readiness")?.confidence ?? model.baseConfidence,
      priority: constraintScore(finishSeverity, model.baseConfidence, 0.68),
      why: "The desk could feel more finished, but this stays behind core functional constraints.",
      evidence: getSignal(signals, "upgrade_readiness")?.evidence ?? ["You asked for a cleaner or more premium feel."],
      sourceSignals: ["upgrade_readiness"],
      structural: false
    });
  }

  return constraints.sort((left, right) => {
    if (left.structural !== right.structural) return left.structural ? -1 : 1;
    const priorityDifference = right.priority - left.priority;
    if (Math.abs(priorityDifference) > 0.04) return priorityDifference;
    return structuralOrder.indexOf(left.key) - structuralOrder.indexOf(right.key);
  });
}

function resolveTradeOffs(input: AssessmentInput, constraints: InferredConstraint[]): ResolvedTradeOff[] {
  const primary = constraints[0];
  if (!primary) return [];

  const tradeOffs: ResolvedTradeOff[] = [];
  const finishWanted = input.whatMattersMost === "More premium feel" || input.whatMattersMost === "Cleaner look";
  const finishConstraint = constraints.find((constraint) => constraint.key === "finish");

  if (finishWanted && primary.key !== "finish") {
    tradeOffs.push({
      id: "finish-deferred",
      summary: `You want ${input.whatMattersMost.toLowerCase()}, but ${primary.label.toLowerCase()} is the stronger constraint.`,
      decision: "Fix the functional issue first. Styling the desk now would make it look better without making it work better."
    });
  }

  if (input.upgradeIntent === "Open to bigger changes" && primary.structural && primary.severity > 0.68) {
    tradeOffs.push({
      id: "upgrade-sequencing",
      summary: "You are open to upgrades, but the first move should still be structural.",
      decision: "Buy only if the product directly reduces the main constraint. Avoid decorative upgrades until the basics improve."
    });
  }

  if (primary.key === "space" && input.setupType === "Dual monitor") {
    tradeOffs.push({
      id: "screen-space-tradeoff",
      summary: "Dual screens add capability, but they are also using the surface aggressively.",
      decision: "Keep the screens only if they earn their space. Otherwise, reduce the footprint before adding accessories."
    });
  }

  if (finishConstraint && primary.key === "ergonomics") {
    tradeOffs.push({
      id: "comfort-over-finish",
      summary: "A cleaner look will not solve physical strain.",
      decision: "Raise and separate the screen/input setup before polishing the surface."
    });
  }

  return unique(tradeOffs).slice(0, 3);
}

function buildSubScores(constraints: InferredConstraint[], signals: WorkspaceSignal[]): DiagnosisSubScore[] {
  const pressureByScore: Record<ScoreKey, number> = { comfort: 0, focus: 0, lighting: 0, fit: 0 };

  constraints.forEach((constraint) => {
    pressureByScore[constraint.scoreKey] = Math.max(pressureByScore[constraint.scoreKey], constraint.severity);
  });

  pressureByScore.focus = Math.max(
    pressureByScore.focus,
    signalValue(signals, "visual_noise") * 0.48 + signalValue(signals, "focus_fragility") * 0.42 + signalValue(signals, "lighting_quality") * 0.12
  );
  pressureByScore.fit = Math.max(
    pressureByScore.fit,
    signalValue(signals, "desk_pressure") * 0.72 + signalValue(signals, "setup_complexity") * 0.14
  );

  return (Object.keys(subScoreLabels) as ScoreKey[]).map((key) => {
    const pressure = clamp(pressureByScore[key]);
    const score = clampScore(88 - pressure * 58);
    const related = constraints.find((constraint) => constraint.scoreKey === key);
    return {
      key,
      label: subScoreLabels[key],
      score,
      summary: related?.why ?? "No strong constraint detected here."
    };
  });
}

function buildOverallScore(subScores: DiagnosisSubScore[], constraints: InferredConstraint[]): number {
  const weights: Record<ScoreKey, number> = { comfort: 0.3, focus: 0.24, lighting: 0.2, fit: 0.26 };
  const primary = constraints[0];

  if (primary) {
    weights[primary.scoreKey] += 0.14;
  }

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return clampScore(subScores.reduce((sum, subScore) => sum + subScore.score * (weights[subScore.key] / total), 0));
}

function scoreKeyLabel(key: ScoreKey): string {
  return key === "fit" ? "space & fit" : key;
}

function actionForConstraint(constraint: InferredConstraint, input: AssessmentInput): ScoreImprovement {
  switch (constraint.key) {
    case "ergonomics":
      return {
        action: input.setupType === "Laptop only" ? "Raise the laptop and use separate input devices" : "Set the main screen closer to eye level",
        effect: "reduces neck and shoulder load",
        scoreLabel: "comfort"
      };
    case "lighting":
      return {
        action: input.lightTiming && input.lightTiming !== "Consistent all day" ? "Stabilise light for the weak part of the day" : "Add clean task light",
        effect: "makes the work area easier to see",
        scoreLabel: "lighting"
      };
    case "space":
      return {
        action: input.surfaceUse === "Storage spills onto the desk" ? "Move storage off the work surface" : "Clear one permanent work zone",
        effect: "gives the setup usable room again",
        scoreLabel: "space & fit"
      };
    case "focus":
      return {
        action: "Reduce visible noise in the main sightline",
        effect: "makes focus easier to hold",
        scoreLabel: "focus"
      };
    case "finish":
      return {
        action: "Use one visual layer to tie the desk together",
        effect: "makes the setup feel more deliberate",
        scoreLabel: "space & fit"
      };
  }
}

function buildIssues(constraints: InferredConstraint[], model: SignalModel): DiagnosisIssue[] {
  const limit = model.depth === "short" ? 2 : model.depth === "medium" ? 3 : 4;
  return constraints.slice(0, limit).map((constraint) => ({
    id: constraint.key,
    label: constraint.label,
    severity: Math.round(constraint.severity * 100),
    confidence: Number(constraint.confidence.toFixed(2)),
    summary: model.confidence === "low" ? `This looks like a likely issue: ${constraint.why}` : constraint.why,
    impact: impactForConstraint(constraint)
  }));
}

function impactForConstraint(constraint: InferredConstraint): string {
  switch (constraint.key) {
    case "ergonomics":
      return "This makes longer sessions more tiring and harder to recover from.";
    case "lighting":
      return "This makes visual work feel heavier, especially when light changes.";
    case "space":
      return "This leaves less room for the work itself.";
    case "focus":
      return "This chips away at attention before you notice it.";
    case "finish":
      return "This affects how settled the desk feels, but it is rarely the first fix.";
  }
}

function buildSummary(input: AssessmentInput, constraints: InferredConstraint[], model: SignalModel): string {
  const primary = constraints[0];
  const secondary = constraints[1];
  if (!primary) {
    return model.confidence === "low"
      ? "DeskLab does not have enough signal to make a strong call yet. Add one detail about how you work, what feels off, or what changes during the day."
      : "Your setup has no single dominant constraint. Keep the basics clear before adding more equipment.";
  }

  const prefix = model.confidence === "low" ? "The strongest visible pattern is" : "The main limitation is";
  const userCondition = input.setupType && input.timeExposure
    ? `Because you are using ${input.setupType.toLowerCase()} for ${input.timeExposure.toLowerCase()}`
    : "From the signals provided";
  const secondLine = secondary && model.depth !== "short" ? ` ${secondary.label} is the next pressure point.` : "";
  const caution = model.confidence === "low" ? " This is a light read, so DeskLab is avoiding deeper claims until you add more context." : "";

  return `${userCondition}, ${prefix} ${primary.label.toLowerCase()}. ${primary.why}${secondLine}${caution}`;
}

function buildReasoning(signals: WorkspaceSignal[], constraints: InferredConstraint[], tradeOffs: ResolvedTradeOff[], model: SignalModel): string[] {
  const lines: string[] = [];
  constraints.slice(0, model.depth === "short" ? 2 : 4).forEach((constraint) => {
    lines.push(`${constraint.label}: ${constraint.evidence[0] ?? constraint.why}`);
  });
  tradeOffs.slice(0, 2).forEach((tradeOff) => lines.push(tradeOff.decision));
  if (model.inputQuality === "light") lines.push("Limited context lowered confidence and reduced output depth.");
  signals.filter((signal) => signal.intensity > 0.75).slice(0, 2).forEach((signal) => {
    lines.push(`${signal.label} is high confidence from ${signal.sources.join(" + ").toLowerCase()}.`);
  });
  return unique(lines).slice(0, model.depth === "short" ? 3 : model.depth === "medium" ? 5 : 7);
}

function buildDiagnosisTags(constraints: InferredConstraint[], signals: WorkspaceSignal[], model: SignalModel): string[] {
  const tags = constraints.slice(0, 3).map((constraint) => constraint.label);
  if (signalValue(signals, "session_intensity") > 0.75) tags.push("High exposure");
  if (model.inputQuality === "light") tags.push("Core signals only");
  return unique(tags).slice(0, 4);
}

function categoryForProduct(key: ProductCatalogKey): ConstraintKey | null {
  switch (productProfiles[key].category) {
    case "ergonomics":
      return "ergonomics";
    case "lighting":
      return "lighting";
    case "organization":
      return "focus";
    case "surface":
      return "space";
    case "wellbeing":
      return "finish";
    default:
      return null;
  }
}

function productReason(key: ProductCatalogKey, constraint: InferredConstraint): string {
  switch (constraint.key) {
    case "ergonomics":
      return key === "adjustable_laptop_stand" || key === "wooden_laptop_stand"
        ? "Helps lift the screen and ease laptop strain."
        : "Helps make the screen setup more comfortable.";
    case "lighting":
      return "Helps improve lighting where you work.";
    case "space":
      return key === "cable_management"
        ? "Helps clear cables off the work surface."
        : "Helps create more usable desk space.";
    case "focus":
      return "Helps reduce what competes for your attention.";
    case "finish":
      return key === "lumomist_diffuser"
        ? "Adds polish once the main setup issues are solved."
        : "Helps the desk feel more considered without adding clutter.";
  }
}

function scoreProducts(input: AssessmentInput, constraints: InferredConstraint[], model: SignalModel): MatchedProduct[] {
  if (model.inputQuality === "light") return [];

  const primary = constraints[0];
  if (!primary) return [];

  const structuralUnresolved = primary.structural && primary.severity > 0.62;
  const limit = model.depth === "deep" ? 3 : 2;

  return productCatalogEntries
    .map((product) => {
      const profile = productProfiles[product.key];
      const related = categoryForProduct(product.key);
      const relatedConstraint = constraints.find((constraint) => constraint.key === related);
      let fitScore = 34;

      if (relatedConstraint) fitScore += relatedConstraint.priority * 46;
      if (primary.key === related) fitScore += 18;
      if (primaryProductBoosts[primary.key].includes(product.key)) fitScore += 16;
      if (input.upgradeIntent === "Free improvements first") fitScore -= 12;
      if ((input.deskSize === "Very small" || input.deskSize === "Small") && profile.spaceImpact === "high") fitScore -= 18;
      if (structuralUnresolved && profile.styleFit === "premium" && related !== primary.key) fitScore -= 28;
      if (primary.key === "ergonomics" && profile.category !== "ergonomics") fitScore -= 8;
      if (primary.key === "lighting" && profile.category !== "lighting" && profile.styleFit === "premium") fitScore -= 12;
      if (primary.key === "space" && ["charging_station", "cable_management", "headphone_stand"].includes(product.key)) fitScore += 10;
      if (primary.key === "focus" && ["cable_management", "leather_desk_mat"].includes(product.key)) fitScore += 8;
      if (input.setupType === "Laptop only" && ["adjustable_laptop_stand", "wooden_laptop_stand"].includes(product.key)) fitScore += 10;
      if (input.frictionSignals.includes("Low light / poor visibility") && product.key === "monitor_light_bar") fitScore += 12;
      if (input.frictionSignals.includes("Clutter / visual noise") && ["cable_management", "charging_station", "headphone_stand"].includes(product.key)) fitScore += 10;
      if (input.whatMattersMost === "More premium feel" && ["leather_desk_mat", "wooden_laptop_stand", "lumomist_diffuser"].includes(product.key)) fitScore += 8;

      const chosenConstraint = relatedConstraint ?? primary;
      return {
        key: product.key,
        product,
        fitScore: Math.round(clamp(fitScore / 100) * 100),
        reasons: [productReason(product.key, chosenConstraint), chosenConstraint.why]
      };
    })
    .filter((product) => product.fitScore >= 58)
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, limit);
}

function buildNextQuestions(input: AssessmentInput, model: SignalModel, constraints: InferredConstraint[]): string[] {
  const questions: string[] = [];
  const primary = constraints[0];

  if (model.inputQuality === "light") {
    questions.push("What gets worse during the day: comfort, light, focus, or available space?");
  }
  if (primary?.key === "ergonomics" && !input.screenPosition) {
    questions.push("Is your main screen below eye level while you work?");
  }
  if (primary?.key === "space" && !input.surfaceUse) {
    questions.push("Which items need to stay on the desk all day, and which are just stored there?");
  }
  if (primary?.key === "lighting" && !input.lightTiming) {
    questions.push("When does the light start to feel weakest?");
  }
  if (!input.extraDetail.trim()) {
    questions.push("Add one sentence about your desk size, discomfort, light, or work style for a sharper diagnosis.");
  }

  return unique(questions).slice(0, model.depth === "short" ? 2 : 3);
}

function profile(input: AssessmentInput): string[] {
  return unique([
    input.setupType,
    input.timeExposure,
    input.workStyle,
    input.deskDensity,
    input.lightingQuality,
    input.deskSize,
    input.whatMattersMost,
    input.upgradeIntent,
    input.screenPosition,
    input.inputDevices,
    input.surfaceUse,
    input.lightTiming,
    input.focusPattern,
    ...input.frictionSignals
  ].filter(Boolean) as string[]);
}

export function diagnoseWorkspace(input: AssessmentInput): DiagnosisResult {
  const signalModel = buildSignalLayer(input);
  const constraints = inferConstraints(input, signalModel);
  const tradeOffs = resolveTradeOffs(input, constraints);
  const subScores = buildSubScores(constraints, signalModel.signals);
  const score = buildOverallScore(subScores, constraints);
  const issues = buildIssues(constraints, signalModel);
  const actions = constraints.slice(0, signalModel.depth === "short" ? 2 : signalModel.depth === "medium" ? 3 : 4).map((constraint) => actionForConstraint(constraint, input));
  const matchedProducts = scoreProducts(input, constraints, signalModel);
  const paidUpgradeItems = matchedProducts.map((match) => {
    const reason = match.reasons[0]?.replace(/\.$/, "") ?? "solves a defined constraint";
    return `${match.product.name} -> ${reason.toLowerCase()} -> supports the main diagnosis`;
  });

  const reasoning = buildReasoning(signalModel.signals, constraints, tradeOffs, signalModel);
  const primary = constraints[0];
  const secondary = constraints[1];

  return {
    score,
    confidence: signalModel.confidence,
    confidenceScore: Number(signalModel.baseConfidence.toFixed(2)),
    confidenceLabel: signalModel.confidenceLabel,
    inputQuality: signalModel.inputQuality,
    inputQualityLabel: signalModel.inputQualityLabel,
    inputQualityNote: signalModel.inputQualityNote,
    moreDetailPrompt: signalModel.moreDetailPrompt,
    summary: buildSummary(input, constraints, signalModel),
    profile: profile(input),
    diagnosisTags: buildDiagnosisTags(constraints, signalModel.signals, signalModel),
    primaryConstraint: primary?.label ?? "More detail needed",
    secondaryConstraint: secondary?.label ?? null,
    signals: signalModel.signals.sort((left, right) => right.intensity - left.intensity),
    constraints,
    tradeOffs,
    subScores,
    mainIssues: issues,
    reasoning,
    whyThisMatters: issues.map((issue) => issue.impact).slice(0, signalModel.depth === "short" ? 2 : 4),
    freeFixes: {
      title: "Fix this first",
      items: actions.map((item) => `${item.action} -> ${item.effect} -> improves ${item.scoreLabel} score`)
    },
    paidUpgrades: {
      title: "Upgrades worth considering",
      items: paidUpgradeItems
    },
    scoreImprovements: actions,
    matchedProducts,
    nextQuestions: buildNextQuestions(input, signalModel, constraints)
  };
}
