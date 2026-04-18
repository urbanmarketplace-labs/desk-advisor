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
        <a className="brandLockup" href="#top">
          <img alt="DeskLab by Urban Marketplace" className="brandLogo" src="/desklab-wordmark.svg?v=1" />
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
              <h1>A better desk begins with a clearer read of what it needs.</h1>
              <p className="heroLead">
                DeskLab studies comfort, focus, lighting, and layout, then shapes a calmer improvement plan with sensible next steps and thoughtful recommendations.
              </p>
              <div className="heroActions">
                <button className="primaryButton lightButton" type="button" onClick={startAssessment}>
                  Diagnose my desk
                </button>
                <span className="heroMeta">Two minutes. Clearer guidance. Better decisions.</span>
              </div>
              <div className="heroHighlights">
                <div>
                  <strong>Comfort</strong>
                  <span>Posture, reach, and fatigue signals.</span>
                </div>
                <div>
                  <strong>Focus</strong>
                  <span>Clarity, hierarchy, and visual calm.</span>
                </div>
                <div>
                  <strong>Fit</strong>
                  <span>Desk size, budget, and real upgrade fit.</span>
                </div>
              </div>
            </div>

            <aside className="heroAside">
              <div className="heroPanel">
                <span className="panelKicker">What DeskLab sees</span>
                <h2 className="heroPanelTitle">Refined workspace guidance starts with understanding what is creating friction.</h2>
                <p className="heroPanelText">
                  DeskLab looks past surface clutter and finds the practical causes of discomfort, visual noise, and wasted desk space.
                </p>
                <div className="heroEditorial">
                  <div>
                    <strong>Posture and positioning</strong>
                    <span>How your screen, keyboard, and reach affect comfort through the day.</span>
                  </div>
                  <div>
                    <strong>Visual quality</strong>
                    <span>How lighting, clutter, and layout shape focus and the overall feel of the desk.</span>
                  </div>
                  <div>
                    <strong>Upgrade judgement</strong>
                    <span>Whether a change genuinely improves the setup or simply adds more noise.</span>
                  </div>
                </div>
              </div>

              <div className="heroFoot">
                <span className="panelKicker">Assessment standard</span>
                <p>
                  Improvements first. Products second. Every recommendation should earn its place in the workspace.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="assessmentSection">
        <div className="assessmentFrame">
          <div className="assessmentIntro">
            <span className="sectionLabel">Assessment</span>
            <h2>Professional guidance shaped around your workspace.</h2>
            <p>Concise, intelligent, and designed to return a recommendation that feels considered.</p>
          </div>

          {phase === "idle" ? (
            <div className="introState">
              <div className="introPoints">
                <span>Fast assessment</span>
                <span>Intelligent scoring</span>
                <span>Premium recommendations</span>
              </div>
              <button className="primaryButton wideButton" type="button" onClick={startAssessment}>
                Begin assessment
              </button>
            </div>
          ) : null}

          {phase === "questions" ? (
            <div className="questionShell">
              <div className="progressMeta">
                <span>
                  Step {stepIndex + 1} of {totalSteps}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progress}%` }} />
              </div>

              <div className="questionArea">
                <span className="sectionLabel">Assessment</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>

                {step.kind === "text" ? (
                  <div className="textareaWrap">
                    <textarea
                      className="textarea"
                      placeholder={step.placeholder}
                      value={assessment.extraDetail}
                      onChange={(event) => updateSingle("extraDetail", event.target.value)}
                    />
                  </div>
                ) : null}

                {step.kind === "single" ? (
                  <div className="optionGrid">
                    {step.options?.map((option) => {
                      const selected = assessment[step.id] === option;
                      return (
                        <button
                          className={selected ? "optionButton selected" : "optionButton"}
                          key={option}
                          type="button"
                          onClick={() => updateSingle(step.id, option as never)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {step.kind === "multi" ? (
                  <div className="pillChoiceRow">
                    {step.options?.map((option) => {
                      const selected = (assessment[step.id] as string[]).includes(option);
                      return (
                        <button
                          className={selected ? "pillChoice selected" : "pillChoice"}
                          key={option}
                          type="button"
                          onClick={() => toggleMultiValue(step.id as "currentFeel" | "problems", option as CurrentFeel | Problem)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="navRow">
                <button className="secondaryButton" type="button" onClick={goBack} disabled={stepIndex === 0}>
                  Back
                </button>
                <button className="primaryButton" type="button" onClick={goNext} disabled={!canContinue}>
                  {stepIndex === totalSteps - 1 ? "Analyse workspace" : "Continue"}
                </button>
              </div>
            </div>
          ) : null}

          {phase === "loading" ? (
            <div className="loadingState" aria-live="polite">
              <div className="thinkingOrb" />
              <span className="sectionLabel">DeskLab is thinking</span>
              <h2>{loadingMessages[loadingIndex]}</h2>
              <p>Building a tighter recommendation plan for this workspace.</p>
            </div>
          ) : null}

          {phase === "result" && result ? (
            <div className="resultShell">
              <div className="resultHero">
                <div className="scoreCard">
                  <span className={`scoreTag ${getScoreAccent(result.score)}`}>{getScoreLabel(result.score)}</span>
                  <div className="score">
                    {result.score}
                    <span className="scoreSuffix">/100</span>
                  </div>
                  <p>{resultHeadline}</p>
                </div>

                <div className="resultOverview">
                  <span className="sectionLabel">Diagnosis</span>
                  <h2>{result.summary}</h2>
                  <div className="signalRow">
                    {resultSignals.map((signal) => (
                      <span className="signalChip" key={signal}>
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="resultGrid">
                <div className="resultBlock">
                  <span className="blockLabel">Fix first</span>
                  <ul className="cleanList">
                    {result.freeFixes.items.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="resultBlock">
                  <span className="blockLabel">Best upgrades</span>
                  <ul className="cleanList">
                    {result.paidUpgrades.items.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="insightStrip">
                {result.mainIssues.slice(0, 3).map((issue) => (
                  <div className="insightCard" key={issue.id}>
                    <strong>{issue.label}</strong>
                    <span>
                      Severity {issue.severity} | Confidence {Math.round(issue.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="productsSection">
                <div className="sectionIntro compactIntro">
                  <span className="sectionLabel">Recommended for this setup</span>
                  <h2>Products that genuinely fit this desk.</h2>
                </div>

                <div className="productGrid">
                  {matchedProducts.map((product) => {
                    const metadata = productReasonMap.get(product.name);
                    return (
                      <article className="productCard" key={product.name}>
                        <div className="productTop">
                          <strong>{product.name}</strong>
                          <span className="fitPill">{product.fitScore}% fit</span>
                        </div>
                        <p>{metadata?.benefits[0] ?? "Selected because it suits the current diagnosis."}</p>
                        <div className="productMeta">
                          {metadata ? <span>{metadata.category}</span> : null}
                          {metadata ? <span>{metadata.priceBand}</span> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
