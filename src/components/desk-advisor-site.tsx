"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diagnoseWorkspace } from "@/core/diagnose";
import { productCatalog } from "@/data/product-catalog";
import { assessmentSteps, emptyAssessment } from "@/data/questions";
import type {
  AssessmentInput,
  CurrentFeel,
  DiagnosisResult,
  Problem
} from "@/types/assessment";

const productReasonMap = new Map(productCatalog.map((product) => [product.name, product]));
const loadingMessages = [
  "Reading posture, lighting, and layout",
  "Comparing free fixes against upgrades",
  "Building a sharper recommendation plan"
];
const brandPlateStyle = {
  display: "block",
  width: "220px",
  height: "72px",
  flex: "0 0 auto",
  borderRadius: "18px",
  backgroundColor: "#2c3e94",
  backgroundImage:
    'url("data:image/png;base64,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[... truncated large base64 ...]",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "auto 56px",
  boxShadow: "0 18px 36px rgba(17, 24, 56, 0.14)"
} as const;

function isStepComplete(stepId: keyof AssessmentInput, value: AssessmentInput[keyof AssessmentInput]): boolean {
  if (stepId === "extraDetail") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
}

function getScoreLabel(score: number): string {
  if (score < 55) return "Needs attention";
  if (score < 76) return "Good base";
  return "Strong setup";
}

function getScoreAccent(score: number): string {
  if (score < 55) return "scoreWarning";
  if (score < 76) return "scoreBalanced";
  return "scoreStrong";
}

function buildHeadline(result: DiagnosisResult, input: AssessmentInput): string {
  const topIssue = result.mainIssues[0]?.label ?? "workspace friction";

  if (input.priority === "Better comfort") {
    return `Comfort is being held back by ${topIssue.toLowerCase()}.`;
  }

  if (input.priority === "Cleaner setup") {
    return "This desk needs stronger structure before extra styling.";
  }

  if (input.priority === "Better focus") {
    return "Too much friction is still getting in the way of focused work.";
  }

  return `Your workspace has a solid base, but ${topIssue.toLowerCase()}.`;
}

function buildSignals(result: DiagnosisResult, input: AssessmentInput): string[] {
  const signals: string[] = [];

  if (result.mainIssues[0]) {
    signals.push(result.mainIssues[0].label);
  }

  if (input.workStyle) {
    signals.push(input.workStyle);
  }

  if (input.deskSize === "Very small" || input.deskSize === "Small") {
    signals.push("Space constrained");
  }

  if (input.upgradeIntent === "Free improvements first") {
    signals.push("Free fixes first");
  }

  return signals.slice(0, 3);
}

export function DeskAdvisorSite() {
  const [assessment, setAssessment] = useState<AssessmentInput>({
    ...emptyAssessment,
    currentFeel: [],
    problems: []
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "questions" | "loading" | "result">("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = assessmentSteps[stepIndex];
  const totalSteps = assessmentSteps.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const canContinue = useMemo(() => isStepComplete(step.id, assessment[step.id]), [assessment, step.id]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);

  function clearLoadingTimers() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }

  function updateSingle<K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) {
    setAssessment((current) => ({ ...current, [key]: value }));
  }

  function toggleMultiValue(key: "currentFeel" | "problems", value: CurrentFeel | Problem) {
    setAssessment((current) => {
      const currentValues = current[key] as string[];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...current,
        [key]: nextValues
      };
    });
  }

  function startAssessment() {
    clearLoadingTimers();
    setResult(null);
    setStepIndex(0);
    setLoadingIndex(0);
    setPhase("questions");
  }

  function goNext() {
    if (!canContinue || phase === "loading") {
      return;
    }

    if (stepIndex === totalSteps - 1) {
      setPhase("loading");
      setLoadingIndex(0);

      loadingIntervalRef.current = setInterval(() => {
        setLoadingIndex((current) => (current + 1) % loadingMessages.length);
      }, 820);

      loadingTimeoutRef.current = setTimeout(() => {
        clearLoadingTimers();
        setResult(diagnoseWorkspace(assessment));
        setPhase("result");
      }, 2600);

      return;
    }

    setStepIndex((current) => current + 1);
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function restart() {
    clearLoadingTimers();
    setAssessment({
      ...emptyAssessment,
      currentFeel: [],
      problems: []
    });
    setResult(null);
    setLoadingIndex(0);
    setPhase("idle");
    setStepIndex(0);
  }

  const matchedProducts = result?.matchedProducts ?? [];
  const resultHeadline = result ? buildHeadline(result, assessment) : "";
  const resultSignals = result ? buildSignals(result, assessment) : [];

  return (
    <main className="page">
      <header className="siteHeader">
        <a aria-label="DeskLab by Urban Marketplace" className="brandLockup" href="#top">
          <span aria-hidden="true" style={brandPlateStyle} />
        </a>
        <button className="ghostButton" type="button" onClick={phase === "idle" ? startAssessment : restart}>
          {phase === "idle" ? "Start assessment" : "Reset"}
        </button>
      </header>

      <section className="heroShell" id="top">
        <div className="heroBackdrop">
          <div className="hero">
            <div className="heroContent">
              <div className="heroBadge">Desk intelligence, refined</div>
              <h1>Understand what your desk needs, then improve it with clarity.</h1>
              <p className="heroLead">
                DeskLab reads the comfort, focus, lighting, and layout signals in your workspace, then returns a simpler plan with better next steps.
              </p>
              <div className="heroActions">
                <button className="primaryButton lightButton" type="button" onClick={startAssessment}>
                  Diagnose my desk
                </button>
                <span className="heroMeta">Two minutes. Better judgement. No unnecessary upgrades.</span>
              </div>
              <div className="heroHighlights">
                <div>
                  <strong>Comfort</strong>
                  <span>Posture, reach, and everyday strain.</span>
                </div>
                <div>
                  <strong>Focus</strong>
                  <span>Visual calm, clutter, and hierarchy.</span>
                </div>
                <div>
                  <strong>Fit</strong>
                  <span>Desk size, budget, and upgrade fit.</span>
                </div>
              </div>
            </div>

            <aside className="heroAside">
              <div className="heroPanel">
                <span className="panelKicker">What DeskLab sees</span>
                <h2 className="heroPanelTitle">A calmer workspace starts with understanding what is creating friction.</h2>
                <p className="heroPanelText">
                  The tool looks beneath surface clutter to identify the practical reasons a desk feels uncomfortable, distracting, or visually heavy.
                </p>
                <div className="heroEditorial">
                  <div>
                    <strong>Posture</strong>
                    <span>How screen height, reach, and positioning affect comfort across the day.</span>
                  </div>
                  <div>
                    <strong>Visual quality</strong>
                    <span>How lighting, cable load, and object density shape the feel of the workspace.</span>
                  </div>
                  <div>
                    <strong>Decision quality</strong>
                    <span>Whether a change genuinely improves the desk or simply adds more to manage.</span>
                  </div>
                </div>
              </div>

              <div className="heroFoot">
                <span className="panelKicker">Assessment standard</span>
                <p>Free improvements first. Products only when they meaningfully improve the setup.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="assessmentSection">
        <div className="assessmentFrame">
          <div className="assessmentIntro">
            <span className="sectionLabel">Assessment</span>
            <h2>Clear guidance shaped around the desk in front of you.</h2>
            <p>Short, intelligent, and built to return a more considered recommendation.</p>
          </div>

          {phase === "idle" ? (
            <div className="introState">
              <div className="introPoints">
                <span>Fast assessment</span>
                <span>Intelligent scoring</span>
                <span>Premium recommendations</span>
                