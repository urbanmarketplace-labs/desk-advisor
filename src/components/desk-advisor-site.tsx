"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diagnoseWorkspace } from "@/core/diagnose";
import { productCatalog } from "@/data/product-catalog";
import { assessmentSteps, emptyAssessment } from "@/data/questions";
import type { AssessmentInput, DiagnosisResult, FrictionSignal } from "@/types/assessment";

const productReasonMap = new Map(productCatalog.map((product) => [product.name, product]));
const loadingMessages = [
  "Analysing workspace signals",
  "Identifying constraints",
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
  if (result.confidence === "low") {
    return "A little more context would make this read more specific.";
  }

  if (result.confidence === "moderate") {
    return "The main constraints are clear, but a little more detail would sharpen the priorities.";
  }

  return "There is enough signal here to be specific about what matters most.";
}

function buildSignals(result: DiagnosisResult): string[] {
  return result.diagnosisTags.slice(0, 4);
}

function formatProductCategory(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  const step = assessmentSteps[stepIndex];
  const totalSteps = assessmentSteps.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const canContinue = useMemo(() => isStepComplete(step.id, assessment[step.id]), [assessment, step.id]);

  useEffect(() => {
    return () => {
      clearLoadingTimers();
      clearRevealTimers();
    };
  }, []);

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
    typingIntervalRef.current = setInterval(() => {
      index += 1;
      setTypedSummary(result.summary.slice(0, index));

      if (index >= result.summary.length) {
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

      if (value === "Nothing obvious") {
        return {
          ...current,
          [key]: [value]
        };
      }

      const filteredValues = currentValues.filter((item) => item !== "Nothing obvious");
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
    setResult(null);
    setTypedSummary("");
    setRevealStage(0);
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
  const whyThisMatters = result?.whyThisMatters ?? [];
  const scoreImprovements = result?.scoreImprovements ?? [];
  const isSummaryTyping = result ? typedSummary.length < result.summary.length : false;

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
                <span>Adaptive weighting</span>
                <span>Confidence-aware diagnosis</span>
                <span>Reasoned recommendations</span>
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
            <div className="loadingState" aria-live="polite">
              <div className="thinkingOrb" />
              <span className="sectionLabel">DeskLab is thinking</span>
              <h2>{loadingMessages[loadingIndex]}</h2>
              <p>Turning your answers into a clearer read of what is helping, what is getting in the way, and what to fix first.</p>
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
                  <p>{result.mainIssues[0]?.impact ?? result.summary}</p>
                  <div className="constraintMeta">
                    <strong>Main issue</strong>
                    <span>{result.primaryConstraint}</span>
                    <strong>Next issue</strong>
                    <span>{result.secondaryConstraint}</span>
                  </div>
                </div>

                <div className="resultOverview">
                  <div className="overviewTop">
                    <div>
                      <span className="sectionLabel">Summary</span>
                      <h2>What to do next</h2>
                    </div>
                    <div className={`confidencePill confidence${result.confidence}`}>
                      {result.confidenceLabel}
                    </div>
                  </div>
                  <p className="resultSummary typingSummary" aria-live="polite">
                    {typedSummary}
                    <span className={isSummaryTyping ? "typingCaret" : "typingCaret hidden"} />
                  </p>
                  <p className="confidenceNote">{getConfidenceSupport(result)}</p>
                  <div className="signalRow">
                    {resultSignals.map((signal) => (
                      <span className="signalChip" key={signal}>
                        {signal}
                      </span>
                    ))}
                  </div>

                  {revealStage >= 1 ? (
                    <div className="subScoreGrid revealBlock isVisible">
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
                  ) : null}
                </div>
              </div>

              {revealStage >= 2 ? (
                <>
                  <div className="productsSection revealBlock isVisible">
                    <div className="sectionIntro compactIntro">
                      <span className="sectionLabel">What’s holding you back</span>
                      <h2>The key issues are clear.</h2>
                      <p>These are the constraints doing the most damage right now.</p>
                    </div>
                    <div className="insightStrip">
                      {result.mainIssues.slice(0, 4).map((issue) => (
                        <div className="insightCard" key={issue.id}>
                          <strong>{issue.label}</strong>
                          <span>{issue.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="resultGrid revealBlock isVisible">
                    <div className="resultBlock">
                      <span className="blockLabel">Why this matters</span>
                      <ul className="cleanList">
                        {whyThisMatters.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="resultBlock">
                      <span className="blockLabel">How this was assessed</span>
                      <ul className="cleanList">
                        {result.reasoning.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : null}

              {revealStage >= 3 ? (
                <>
                  <div className="resultGrid revealBlock isVisible">
                    <div className="resultBlock">
                      <span className="blockLabel">Fix this first</span>
                      <ul className="cleanList">
                        {result.freeFixes.items.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    {scoreImprovements.length > 0 ? (
                      <div className="resultBlock">
                        <span className="blockLabel">How to improve your score</span>
                        <ul className="cleanList">
                          {scoreImprovements.map((item) => (
                            <li key={`${item.action}-${item.scoreLabel}`}>
                              {item.action} -&gt; {item.effect} -&gt; improves {item.scoreLabel} score
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="resultBlock">
                        <span className="blockLabel">How to improve your score</span>
                        <ul className="cleanList">
                          <li>Keep the current priorities in place, then add more setup detail to sharpen the next step.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {result.nextQuestions.length > 0 ? (
                    <div className="rationalePanel revealBlock isVisible">
                      <span className="sectionLabel">To sharpen this further</span>
                      <ul className="cleanList">
                        {result.nextQuestions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}

              {revealStage >= 4 ? (
                <>
                  {result.paidUpgrades.items.length > 0 ? (
                    <div className="rationalePanel revealBlock isVisible">
                      <span className="sectionLabel">Upgrades</span>
                      <ul className="cleanList">
                        {result.paidUpgrades.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="productsSection revealBlock isVisible">
                    <div className="sectionIntro compactIntro">
                      <span className="sectionLabel">Products worth considering</span>
                      <h2>Only the options that solve a real problem.</h2>
                      <p>Each one connects back to a clear constraint in this setup.</p>
                    </div>

                    <div className="productGrid">
                      {matchedProducts.map((product) => {
                        const metadata = productReasonMap.get(product.name);
                        return (
                          <article className="productCard" key={product.name}>
                            <div className="productTop">
                              <strong>{product.name}</strong>
                            </div>
                            <p>{product.reasons[0] ?? metadata?.benefits[0] ?? "Included because it solves a real problem in this setup."}</p>
                            <div className="productMeta">
                              {product.reasons[1] ? <span>{product.reasons[1]}</span> : null}
                              {metadata ? <span>{formatProductCategory(metadata.category)}</span> : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
