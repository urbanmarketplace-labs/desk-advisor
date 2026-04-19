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
  "Reviewing layout, comfort, and lighting",
  "Separating free fixes from justified upgrades",
  "Building a clearer recommendation plan"
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
  const topIssue = result.primaryConstraint.toLowerCase();

  if (input.priority === "Better comfort") {
    return `Comfort is mainly being limited by ${topIssue}.`;
  }

  if (input.priority === "Cleaner setup") {
    return "This desk needs stronger structure before any finishing touches.";
  }

  if (input.priority === "Better focus") {
    return "Too much friction is still sitting in the way of focused work.";
  }

  return `The main pressure point right now is ${topIssue}.`;
}

function buildSignals(result: DiagnosisResult, input: AssessmentInput): string[] {
  const signals = [...result.diagnosisTags];

  if (input.workStyle) {
    signals.push(input.workStyle);
  }

  if (input.deskSize === "Very small" || input.deskSize === "Small") {
    signals.push("Space constrained");
  }

  if (input.upgradeIntent === "Free improvements first") {
    signals.push("Free fixes first");
  }

  return [...new Set(signals)].slice(0, 4);
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
          <img
            alt="DeskLab by Urban Marketplace"
            className="brandImage"
            src="/desklabs-logo-transparent.png?v=2"
          />
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
              <h1>Understand what is creating friction in your workspace, then improve it with confidence.</h1>
              <p className="heroLead">
                DeskLab reviews comfort, focus, lighting, and fit, then returns clear next steps and only suggests upgrades when they are justified.
              </p>
              <div className="heroActions">
                <button className="primaryButton lightButton" type="button" onClick={startAssessment}>
                  Diagnose my desk
                </button>
                <span className="heroMeta">A short assessment. Clear guidance. No unnecessary upgrades.</span>
              </div>
              <div className="heroHighlights">
                <div>
                  <strong>Comfort</strong>
                  <span>Posture, reach, and daily ease.</span>
                </div>
                <div>
                  <strong>Focus</strong>
                  <span>Visual calm, clutter, and working clarity.</span>
                </div>
                <div>
                  <strong>Fit</strong>
                  <span>Desk size, layout discipline, and upgrade suitability.</span>
                </div>
              </div>
            </div>

            <aside className="heroAside">
              <div className="heroPanel">
                <span className="panelKicker">What DeskLab sees</span>
                <h2 className="heroPanelTitle">A better workspace starts with a clearer read of what is actually getting in the way.</h2>
                <p className="heroPanelText">
                  It looks past surface clutter and picks out the practical reasons a desk feels uncomfortable, distracting, visually heavy, or over-equipped.
                </p>
                <div className="heroEditorial">
                  <div>
                    <strong>Posture</strong>
                    <span>Whether screen height, reach, and input position are supporting the way you actually work.</span>
                  </div>
                  <div>
                    <strong>Visual quality</strong>
                    <span>How lighting, cable load, and object density affect clarity, calm, and concentration.</span>
                  </div>
                  <div>
                    <strong>Upgrade judgement</strong>
                    <span>Whether a product would meaningfully improve the desk or simply add more to manage.</span>
                  </div>
                </div>
              </div>

              <div className="heroFoot">
                <span className="panelKicker">Assessment standard</span>
                <p>Practical changes first. Products only when they improve the setup in a clear, defensible way.</p>
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
            <p>A short assessment designed to return an explainable diagnosis and practical next steps.</p>
          </div>

          {phase === "idle" ? (
            <div className="introState">
              <div className="introPoints">
                <span>Weighted scoring</span>
                <span>Tailored diagnosis</span>
                <span>Justified upgrades</span>
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
              <p>Translating your answers into a sharper diagnosis and a cleaner improvement plan.</p>
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
                  <div className="constraintMeta">
                    <strong>Primary constraint</strong>
                    <span>{result.primaryConstraint}</span>
                    {result.secondaryConstraint ? (
                      <>
                        <strong>Secondary constraint</strong>
                        <span>{result.secondaryConstraint}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="resultOverview">
                  <span className="sectionLabel">Diagnosis</span>
                  <h2>Your workspace diagnosis</h2>
                  <p className="resultSummary">{result.summary}</p>
                  <div className="signalRow">
                    {resultSignals.map((signal) => (
                      <span className="signalChip" key={signal}>
                        {signal}
                      </span>
                    ))}
                  </div>
                  <div className="subScoreGrid">
                    {result.subScores.map((subScore) => (
                      <div className="subScoreCard" key={subScore.key}>
                        <div className="subScoreTop">
                          <strong>{subScore.label}</strong>
                          <span>{subScore.score}/100</span>
                        </div>
                        <div className="miniTrack">
                          <div className="miniFill" style={{ width: `${subScore.score}%` }} />
                        </div>
                        <p>{subScore.summary}</p>
                      </div>
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

              {result.whyTheseRecommendations.length > 0 ? (
                <div className="rationalePanel">
                  <span className="sectionLabel">Why this direction</span>
                  <ul className="cleanList">
                    {result.whyTheseRecommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="insightStrip">
                {result.mainIssues.slice(0, 3).map((issue) => (
                  <div className="insightCard" key={issue.id}>
                    <strong>{issue.label}</strong>
                    <span>{issue.causes[0]}</span>
                  </div>
                ))}
              </div>

              <div className="productsSection">
                <div className="sectionIntro compactIntro">
                  <span className="sectionLabel">Recommended for this setup</span>
                  <h2>Relevant products for this desk.</h2>
                  <p>These are the most relevant directions for the issues showing up in this setup.</p>
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
                        <p>{product.reasons[0] ?? metadata?.benefits[0] ?? "Selected because it suits the current diagnosis."}</p>
                        <div className="productMeta">
                          {product.reasons[1] ? <span>{product.reasons[1]}</span> : null}
                          {metadata ? <span>{metadata.category}</span> : null}
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
