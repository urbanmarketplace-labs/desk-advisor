"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diagnoseWorkspace } from "@/core/diagnose";
import { productCatalog } from "@/data/product-catalog";
import { emptyAssessment, getAdaptiveAssessmentSteps } from "@/data/questions";
import type { AssessmentInput, DiagnosisResult, FrictionSignal } from "@/types/assessment";

const productReasonMap = new Map(productCatalog.map((product) => [product.name, product]));
const loadingMessages = [
  "Analysing workspace signals",
  "Inferring constraints",
  "Identifying constraints",
  "Resolving trade-offs",
  "Building recommendations"
];
const summaryTypingSpeed = 18;

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

function getConfidenceSupport(result: DiagnosisResult): string {
  if (result.inputQuality === "light") {
    return "This stays careful because it is working from the core answers only.";
  }

  if (result.inputQuality === "moderate") {
    return "The main pattern is clear, but a little more detail would still sharpen the read.";
  }

  return "There is enough signal here to be specific about what matters most.";
}

function buildSignals(result: DiagnosisResult): string[] {
  return result.signals
    .filter((signal) => signal.intensity > 0.48)
    .slice(0, 4)
    .map((signal) => `${signal.label} ${Math.round(signal.intensity * 100)}%`);
}

function formatProductCategory(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function firstSentence(value: string): string {
  const sentence = value.split(". ")[0]?.trim() ?? value.trim();
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function getCompactDiagnosis(result: DiagnosisResult): string {
  const primary = result.mainIssues[0]?.summary ?? result.summary;
  const secondary = result.mainIssues.find((issue) => issue.label !== result.primaryConstraint);

  if (!secondary) {
    return firstSentence(primary);
  }

  return `${firstSentence(primary)} Secondary issue: ${secondary.label.toLowerCase()}.`;
}

function getCueIcon(value: string): string {
  const text = value.toLowerCase();

  if (text.includes("screen") || text.includes("laptop") || text.includes("monitor")) return "🖥️";
  if (text.includes("light") || text.includes("shadow")) return "💡";
  if (text.includes("clutter") || text.includes("clear") || text.includes("cable")) return "🧹";
  if (text.includes("space") || text.includes("surface") || text.includes("fit")) return "📏";
  if (text.includes("comfort") || text.includes("strain") || text.includes("neck") || text.includes("shoulder")) return "😌";
  if (text.includes("focus") || text.includes("visual")) return "🎯";

  return "⬆️";
}

function getScoreName(scoreLabel: string): string {
  const text = scoreLabel.toLowerCase();

  if (text.includes("comfort")) return "Comfort";
  if (text.includes("lighting")) return "Lighting";
  if (text.includes("focus")) return "Focus";
  if (text.includes("space")) return "Space";

  return "Score";
}

function getGainEstimate(result: DiagnosisResult, scoreLabel: string, index: number): number {
  const scoreName = getScoreName(scoreLabel).toLowerCase();
  const subScore = result.subScores.find((score) => score.label.toLowerCase().includes(scoreName))?.score ?? result.score;
  const multiplier = index === 0 ? 0.22 : index === 1 ? 0.18 : 0.14;

  return Math.max(4, Math.min(12, Math.round((100 - subScore) * multiplier)));
}

function getCompactActionLine(item: DiagnosisResult["scoreImprovements"][number]): string {
  const actionIcon = getCueIcon(item.action);
  const effectIcon = getCueIcon(item.effect);
  const scoreName = getScoreName(item.scoreLabel).toLowerCase();

  return `${actionIcon} ${item.action}  •  ${effectIcon} ${item.effect}  •  ⬆️ improve ${scoreName}`;
}

export function DeskAdvisorSite() {
  const [assessment, setAssessment] = useState<AssessmentInput>(emptyAssessment);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "questions" | "loading" | "result">("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [typedSummary, setTypedSummary] = useState("");
  const [revealStage, setRevealStage] = useState(0);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const guideToAssessmentRef = useRef(false);
  const assessmentFrameRef = useRef<HTMLDivElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const livePanelRef = useRef<HTMLDivElement | null>(null);

  const adaptiveSteps = useMemo(() => getAdaptiveAssessmentSteps(assessment), [assessment]);
  const step = adaptiveSteps[Math.min(stepIndex, adaptiveSteps.length - 1)];
  const totalSteps = adaptiveSteps.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const canContinue = useMemo(() => isStepComplete(step.id, assessment[step.id]), [assessment, step.id]);

  useEffect(() => {
    return () => {
      clearLoadingTimers();
      clearRevealTimers();
    };
  }, []);

  useEffect(() => {
    if (stepIndex >= adaptiveSteps.length) {
      setStepIndex(Math.max(0, adaptiveSteps.length - 1));
    }
  }, [adaptiveSteps.length, stepIndex]);

  useEffect(() => {
    clearRevealTimers();

    if (phase !== "result" || !result) {
      setTypedSummary("");
      setRevealStage(0);
      return;
    }

    setTypedSummary("");
    setRevealStage(0);

    let index = 0;
    const compactSummary = getCompactDiagnosis(result);
    typingIntervalRef.current = setInterval(() => {
      index += 1;
      setTypedSummary(compactSummary.slice(0, index));

      if (index >= compactSummary.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }

        setRevealStage(1);
        revealTimeoutsRef.current.push(setTimeout(() => setRevealStage(2), 180));
        revealTimeoutsRef.current.push(setTimeout(() => setRevealStage(3), 360));
        revealTimeoutsRef.current.push(setTimeout(() => setRevealStage(4), 560));
      }
    }, summaryTypingSpeed);

    return () => {
      clearRevealTimers();
    };
  }, [phase, result]);

  useEffect(() => {
    if (!guideToAssessmentRef.current) {
      return;
    }

    if (phase === "questions") {
      const target = questionHeadingRef.current ?? assessmentFrameRef.current;
      requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        target?.focus({ preventScroll: true });
        guideToAssessmentRef.current = false;
      });
      return;
    }

    if (phase === "loading" || phase === "result") {
      const target = livePanelRef.current ?? assessmentFrameRef.current;
      requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        target?.focus({ preventScroll: true });
        guideToAssessmentRef.current = false;
      });
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "questions") {
      questionHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [phase, stepIndex]);

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

  function clearRevealTimers() {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    revealTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    revealTimeoutsRef.current = [];
  }

  function updateSingle<K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) {
    setAssessment((current) => ({ ...current, [key]: value }));
  }

  function toggleMultiValue(key: "frictionSignals", value: FrictionSignal, maxSelections = 2) {
    setAssessment((current) => {
      const currentValues = current[key];

      if (currentValues.includes(value)) {
        return {
          ...current,
          [key]: currentValues.filter((item) => item !== value)
        };
      }

      if (value === "Nothing obvious, just feels off") {
        return {
          ...current,
          [key]: [value]
        };
      }

      const filteredValues = currentValues.filter((item) => item !== "Nothing obvious, just feels off");
      const nextValues = [...filteredValues, value].slice(-maxSelections);

      return {
        ...current,
        [key]: nextValues
      };
    });
  }

  function startAssessment() {
    clearLoadingTimers();
    clearRevealTimers();
    guideToAssessmentRef.current = true;
    setResult(null);
    setTypedSummary("");
    setRevealStage(0);
    setStepIndex(0);
    setLoadingIndex(0);
    setPhase("questions");
  }

  function goToAssessment() {
    guideToAssessmentRef.current = true;

    if (phase === "idle") {
      startAssessment();
      return;
    }

    const target = phase === "questions" ? questionHeadingRef.current : livePanelRef.current ?? assessmentFrameRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.focus({ preventScroll: true });
    guideToAssessmentRef.current = false;
  }

  function goNext() {
    if (!canContinue || phase === "loading") {
      return;
    }

    if (stepIndex === totalSteps - 1) {
      setPhase("loading");
      setLoadingIndex(0);
      guideToAssessmentRef.current = true;

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
    clearRevealTimers();
    setAssessment(emptyAssessment);
    setResult(null);
    setTypedSummary("");
    setRevealStage(0);
    setLoadingIndex(0);
    setPhase("idle");
    setStepIndex(0);
  }

  const matchedProducts = result?.matchedProducts ?? [];
  const resultSignals = result ? buildSignals(result) : [];
  const scoreImprovements = result?.scoreImprovements ?? [];
  const compactSummary = result ? getCompactDiagnosis(result) : "";
  const isSummaryTyping = result ? typedSummary.length < compactSummary.length : false;
  const primaryCtaLabel = phase === "idle" ? "Start assessment" : "Go to assessment";
  const heroCtaLabel = phase === "idle" ? "Begin assessment" : phase === "result" ? "View diagnosis" : "Continue assessment";

  return (
    <main className="page">
      <header className="siteHeader">
        <a aria-label="DeskLab by Urban Marketplace" className="brandLockup" href="#top">
          <img
            alt="DeskLab by Urban Marketplace"
            className="brandImage"
            src="/desklab-logo-transparent.png"
          />
        </a>
        <button className="ghostButton" type="button" onClick={goToAssessment}>
          {primaryCtaLabel}
        </button>
      </header>

      <section className="heroShell" id="top">
        <div className="heroBackdrop">
          <div className="hero">
            <div className="heroContent">
              <div className="heroBadge">Desk intelligence, refined</div>
              <h1>Find what is actually holding your desk back.</h1>
              <p className="heroLead">
                DeskLab reads your setup, asks smarter follow-ups, then explains what to fix first and why.
              </p>
              <div className="heroActions">
                <button className="primaryButton lightButton" type="button" onClick={goToAssessment}>
                  {heroCtaLabel}
                </button>
                <span className="heroMeta">Adaptive questions. Clear priorities. No filler.</span>
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
                <h2 className="heroPanelTitle">It turns answers into signals, then resolves what matters most.</h2>
                <p className="heroPanelText">
                  If comfort, space, light, and style conflict, DeskLab prioritises the constraint that changes daily use.
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

      <section className="assessmentSection" id="assessment">
        <div className="assessmentFrame" ref={assessmentFrameRef} tabIndex={-1}>
          <div className="assessmentIntroRow">
            <div className="assessmentIntro">
              <span className="sectionLabel">Assessment</span>
              <h2>Clear guidance shaped around the desk in front of you.</h2>
              <p>The path changes as DeskLab learns more about your setup.</p>
            </div>
            {phase !== "idle" ? (
              <button className="textButton" type="button" onClick={restart}>
                Reset assessment
              </button>
            ) : null}
          </div>

          {phase === "idle" ? (
            <div className="introState">
              <div className="introPoints">
                <span>Adaptive questions</span>
                <span>Signal-based reasoning</span>
                <span>Confidence-aware output</span>
              </div>
              <button className="primaryButton wideButton" type="button" onClick={goToAssessment}>
                Begin assessment
              </button>
            </div>
          ) : null}

          {phase === "questions" ? (
            <div className="questionShell" ref={livePanelRef} tabIndex={-1}>
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
                <span className="sectionLabel">Live assessment</span>
                <h2 ref={questionHeadingRef} tabIndex={-1}>{step.title}</h2>
                <p>{step.description}</p>
                {step.reason ? <span className="questionHint">{step.reason}</span> : null}

                {step.kind === "text" ? (
                  <div className="textareaWrap">
                    <textarea
                      className="textarea"
                      placeholder={step.placeholder}
                      value={assessment.extraDetail}
                      onChange={(event) => updateSingle("extraDetail", event.target.value)}
                    />
                    <span className="questionHint">Optional, but this is the part that makes the diagnosis more specific.</span>
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
                  <>
                    <div className="pillChoiceRow">
                      {step.options?.map((option) => {
                        const selected = (assessment[step.id] as string[]).includes(option);
                        return (
                          <button
                            className={selected ? "pillChoice selected" : "pillChoice"}
                            key={option}
                            type="button"
                            onClick={() => toggleMultiValue("frictionSignals", option as FrictionSignal, step.maxSelections ?? 2)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {step.maxSelections ? <span className="questionHint">Choose up to {step.maxSelections}.</span> : null}
                  </>
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
            <div className="loadingState" aria-live="polite" ref={livePanelRef} tabIndex={-1}>
              <div className="thinkingOrb" />
              <span className="sectionLabel">DeskLab is thinking</span>
              <h2>{loadingMessages[loadingIndex]}</h2>
              <p>Turning answers into signals, constraints, trade-offs, and next actions.</p>
            </div>
          ) : null}

          {phase === "result" && result ? (
            <div className="resultShell" ref={livePanelRef} tabIndex={-1}>
              <div className="resultHero">
                <div className="scoreCard">
                  <span className={`scoreTag ${getScoreAccent(result.score)}`}>{getScoreLabel(result.score)}</span>
                  <div className="score">
                    {result.score}
                    <span className="scoreSuffix">/100</span>
                  </div>
                  <p>{result.inputQualityLabel} · {result.confidenceLabel}</p>
                  <div className="subScoreGrid revealBlock isVisible">
                    {result.subScores.map((subScore) => (
                      <div className="subScoreCard" key={subScore.key}>
                        <div className="subScoreTop">
                          <strong>{subScore.label}</strong>
                          <span>{subScore.score}</span>
                        </div>
                        <div className="miniTrack">
                          <div className="miniFill" style={{ width: `${subScore.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="resultOverview">
                  <div className="overviewTop">
                    <div>
                      <span className="sectionLabel">Main issue</span>
                      <h2>⚠️ {result.primaryConstraint}</h2>
                    </div>
                    <div className="pillStack">
                      <div className="confidencePill qualityPill">{result.inputQualityLabel}</div>
                      <div className={`confidencePill confidence${result.confidence}`}>{result.confidenceLabel}</div>
                    </div>
                  </div>
                  <p className="resultSummary typingSummary" aria-live="polite">
                    {typedSummary}
                    <span className={isSummaryTyping ? "typingCaret" : "typingCaret hidden"} />
                  </p>
                  <div className="signalRow">
                    {resultSignals.map((signal) => (
                      <span className="signalChip" key={signal}>
                        {signal}
                      </span>
                    ))}
                  </div>

                  <details className="inputQualityCard">
                    <summary>See why</summary>
                    <strong>{getConfidenceSupport(result)}</strong>
                    <span>{result.inputQualityNote} Confidence score: {Math.round(result.confidenceScore * 100)}%.</span>
                    {result.reasoning.slice(0, 3).map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                    {result.tradeOffs.slice(0, 1).map((tradeOff) => (
                      <p key={tradeOff.id}>{tradeOff.summary} {tradeOff.decision}</p>
                    ))}
                    {result.moreDetailPrompt ? <p>{result.moreDetailPrompt}</p> : null}
                  </details>
                </div>
              </div>

              {revealStage >= 2 ? (
                <div className="resultGrid revealBlock isVisible">
                  <div className="resultBlock">
                    <span className="blockLabel">Fix this first</span>
                    <ul className="cleanList">
                      {scoreImprovements.slice(0, 3).map((item) => (
                        <li key={`${item.action}-${item.scoreLabel}`}>{getCompactActionLine(item)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="resultBlock">
                    <span className="blockLabel">Fastest score improvements</span>
                    <ul className="cleanList">
                      {scoreImprovements.slice(0, 4).map((item, index) => (
                        <li key={`${item.action}-${item.scoreLabel}-gain`}>
                          {getCueIcon(item.action)} {item.action}  <strong>+{getGainEstimate(result, item.scoreLabel, index)} {getScoreName(item.scoreLabel)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {revealStage >= 4 ? (
                <div className="productsSection revealBlock isVisible">
                  <div className="sectionIntro compactIntro">
                    <span className="sectionLabel">Best matching products</span>
                    <h2>Only if it solves the main constraint.</h2>
                  </div>

                  {matchedProducts.length > 0 ? (
                    <div className="productGrid">
                      {matchedProducts.slice(0, 3).map((product) => {
                        const metadata = productReasonMap.get(product.name);
                        return (
                          <article className="productCard" key={product.name}>
                            <div className="productTop">
                              <strong>{product.name}</strong>
                            </div>
                            <p>{product.reasons[0] ?? metadata?.benefits[0] ?? "Matches the highest-impact constraint in this setup."}</p>
                            <div className="productMeta">
                              {metadata ? <span>{formatProductCategory(metadata.category)}</span> : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rationalePanel">
                      <span className="sectionLabel">No product-first fix yet</span>
                      <p>Start with the setup changes above. They are likely to improve the score faster than buying more.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
