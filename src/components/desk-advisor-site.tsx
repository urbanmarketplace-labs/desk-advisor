"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diagnoseWorkspace } from "@/core/diagnose";
import { emptyAssessment, getAdaptiveAssessmentSteps } from "@/data/questions";
import { trackDeskLabEvent } from "@/lib/desklab-events";
import type { AssessmentInput, DiagnosisResult, FrictionSignal } from "@/types/assessment";

const loadingMessages = [
  "Reading your setup",
  "Finding the main issue",
  "Checking what matters most",
  "Building your next steps"
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
    return "Light diagnosis. A short note about your setup would make this more precise.";
  }

  if (result.inputQuality === "moderate") {
    return "Moderate confidence. The main pattern is clear.";
  }

  return "High confidence. Based on detailed inputs.";
}

function buildSignals(result: DiagnosisResult): string[] {
  return result.signals
    .filter((signal) => signal.intensity > 0.48)
    .slice(0, 3)
    .map((signal) => formatSignalLabel(signal.label));
}

function firstSentence(value: string): string {
  const sentence = value.split(". ")[0]?.trim() ?? value.trim();
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function getCompactDiagnosis(result: DiagnosisResult): string {
  const primary = humanizeCopy(result.mainIssues[0]?.summary ?? result.summary);
  const secondary = result.mainIssues.find((issue) => issue.label !== result.primaryConstraint);

  if (!secondary) {
    return firstSentence(primary);
  }

  return `${firstSentence(primary)} Next issue: ${humanizeConstraint(secondary.label).toLowerCase()}.`;
}

function humanizeConstraint(value: string): string {
  return value
    .replace("Space and surface pressure", "Not enough usable space")
    .replace("Lighting reliability", "Lighting could be better")
    .replace("Focus and visual clarity", "Too much competing for attention")
    .replace("Comfort and posture", "Comfort and posture")
    .replace("Finish and visual polish", "Visual polish");
}

function formatSignalLabel(value: string): string {
  return value
    .replace("Ergonomics risk", "Comfort")
    .replace("Visual noise", "Visual clutter")
    .replace("Lighting quality", "Lighting")
    .replace("Desk pressure", "Usable space")
    .replace("Session intensity", "Desk time")
    .replace("Setup complexity", "Setup size")
    .replace("Upgrade readiness", "Upgrade fit")
    .replace("Focus fragility", "Focus");
}

function humanizeCopy(value: string): string {
  return value
    .replaceAll("space pressure is high", "there may not be enough usable space")
    .replaceAll("surface pressure", "usable-space limits")
    .replaceAll("Desk pressure", "Usable space")
    .replaceAll("visual noise", "visual clutter")
    .replaceAll("Visual noise", "Visual clutter")
    .replaceAll("focus fragility", "focus")
    .replaceAll("Focus fragility", "Focus")
    .replaceAll("is affecting", "can affect")
    .replaceAll("is causing", "can lead to")
    .replaceAll("is limiting", "may be holding back")
    .replaceAll("constraint", "issue")
    .replaceAll("Constraint", "Issue")
    .replaceAll("signal", "input")
    .replaceAll("Signal", "Input");
}

function getWhyBlocks(result: DiagnosisResult): Array<{ icon: string; label: string; text: string }> {
  const blocks = result.constraints.slice(0, 3).map((constraint) => ({
    icon: getCueIcon(constraint.label),
    label: humanizeConstraint(constraint.label),
    text: humanizeCopy(constraint.evidence[0] ?? constraint.why)
  }));

  return [
    ...blocks,
    {
      icon: "Priority",
      label: "Priority",
      text: `${humanizeConstraint(result.primaryConstraint)} matters most right now. Fixing it should have the biggest impact.`
    }
  ].slice(0, 4);
}

function getCueIcon(value: string): string {
  const text = value.toLowerCase();

  if (text.includes("screen") || text.includes("laptop") || text.includes("monitor")) return "Screen";
  if (text.includes("light") || text.includes("shadow")) return "Light";
  if (text.includes("clutter") || text.includes("clear") || text.includes("cable")) return "Clear";
  if (text.includes("space") || text.includes("surface") || text.includes("fit")) return "Space";
  if (text.includes("comfort") || text.includes("strain") || text.includes("neck") || text.includes("shoulder")) return "Comfort";
  if (text.includes("focus") || text.includes("visual")) return "Focus";

  return "Note";
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

function getSimpleProductReason(product: DiagnosisResult["matchedProducts"][number]): string {
  switch (product.key) {
    case "monitor_stand":
      return "Raises your screen and frees up desk space.";
    case "adjustable_laptop_stand":
      return "Helps reduce neck strain during longer sessions.";
    case "wooden_laptop_stand":
      return "Lifts your laptop while keeping the setup clean.";
    case "monitor_light_bar":
      return "Improves lighting where you actually work.";
    case "cable_management":
      return "Clears cables from your main work area.";
    case "charging_station":
      return "Keeps everyday charging in one cleaner spot.";
    case "leather_desk_mat":
      return "Defines a calmer main work zone.";
    case "wooden_tablet_stand":
      return "Moves a second device off the desk surface.";
    case "headphone_stand":
      return "Keeps headphones off the desk when not in use.";
    case "lumomist_diffuser":
      return "Adds polish once the practical fixes are handled.";
  }

  const reason = product.reasons[0] ?? "Helps improve a real issue in your setup.";

  if (/lighting|visibility|light/i.test(reason)) return "Helps improve lighting where you work.";
  if (/ergonomic|comfort|posture|strain|screen/i.test(reason)) return "Helps make long desk sessions more comfortable.";
  if (/surface|space|pressure|storage/i.test(reason)) return "Helps create more usable desk space.";
  if (/visual|focus|noise|clutter/i.test(reason)) return "Helps reduce what competes for your attention.";

  return humanizeCopy(reason.replace(/^Recommended because /, "Helps because "));
}

function serializeAnswerValue(value: AssessmentInput[keyof AssessmentInput]): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
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
  const quickCheckStep = Math.min(5, Math.max(1, Math.ceil(((stepIndex + 1) / totalSteps) * 5)));

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
    trackDeskLabEvent({ event_name: "assessment_started" });
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

    trackDeskLabEvent({
      event_name: "question_answered",
      question_id: step.id,
      answer_value: serializeAnswerValue(assessment[step.id])
    });

    if (stepIndex === totalSteps - 1) {
      setPhase("loading");
      setLoadingIndex(0);
      guideToAssessmentRef.current = true;

      loadingIntervalRef.current = setInterval(() => {
        setLoadingIndex((current) => (current + 1) % loadingMessages.length);
      }, 820);

      loadingTimeoutRef.current = setTimeout(() => {
        clearLoadingTimers();
        const diagnosis = diagnoseWorkspace(assessment);
        setResult(diagnosis);
        trackDeskLabEvent({
          event_name: "assessment_completed",
          score: diagnosis.score,
          main_issue: humanizeConstraint(diagnosis.primaryConstraint)
        });
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
  const primaryCtaLabel = phase === "idle" ? "Start free check" : "Go to quick check";
  const heroCtaLabel = phase === "idle" ? "Start free check" : phase === "result" ? "View results" : "Continue check";
  const progressMessage = quickCheckStep >= 5 ? "One more step to your result." : quickCheckStep >= 4 ? "Nearly there." : quickCheckStep >= 3 ? "Now we can find the main issue." : "Good — that helps narrow it down.";
  const shouldShowProgressMessage = stepIndex > 0;

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
              <div className="heroBadge">DeskLab</div>
              <h1>Fix your desk in 30 seconds.</h1>
              <p className="heroLead">
                Find what’s hurting your focus, comfort, or space — then see what to fix first.
              </p>
              <p className="heroSupport">Answer a few quick questions and get a personalised desk score.</p>
              <div className="heroActions">
                <button className="primaryButton lightButton" type="button" onClick={goToAssessment}>
                  {heroCtaLabel}
                </button>
                <span className="heroMeta">No sign-up. No guesswork. Just clear next steps.</span>
              </div>
              <div className="heroHighlights">
                <div>
                  <strong>Comfort</strong>
                  <span>Better screen height and daily ease.</span>
                </div>
                <div>
                  <strong>Focus</strong>
                  <span>Less clutter and clearer focus.</span>
                </div>
                <div>
                  <strong>Space</strong>
                  <span>More usable room where you work.</span>
                </div>
              </div>
            </div>

            <aside className="heroAside">
              <div className="heroPanel">
                <span className="panelKicker">What you get</span>
                <h2 className="heroPanelTitle">A desk score, your biggest issue, and what to fix first.</h2>
                <p className="heroPanelText">
                  Fast, practical advice that shows what is getting in the way and what will help first.
                </p>
                <div className="heroEditorial">
                  <div>
                    <strong>Comfort</strong>
                    <span>See if screen height and reach may be making longer sessions harder.</span>
                  </div>
                  <div>
                    <strong>Focus</strong>
                    <span>Spot the clutter, lighting, or layout issues that can quietly drain attention.</span>
                  </div>
                  <div>
                    <strong>Best next step</strong>
                    <span>Know whether to change the setup first or add something that solves a real issue.</span>
                  </div>
                </div>
              </div>

              <div className="heroFoot">
                <span className="panelKicker">Free check</span>
                <p>Instant result. Clear next steps.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="assessmentSection" id="assessment">
        <div className="assessmentFrame" ref={assessmentFrameRef} tabIndex={-1}>
          <div className="assessmentIntroRow">
            <div className="assessmentIntro">
              <span className="sectionLabel">Quick check</span>
              <h2>Answer a few quick questions and get your desk score.</h2>
              <p>This takes around 30 seconds.</p>
            </div>
            {phase !== "idle" ? (
              <button className="textButton" type="button" onClick={restart}>
                Start again
              </button>
            ) : null}
          </div>

          {phase === "idle" ? (
            <div className="introState">
              <div className="introPoints">
                <span>Fast questions</span>
                <span>Clear score</span>
                <span>What to fix first</span>
              </div>
              <button className="primaryButton wideButton" type="button" onClick={goToAssessment}>
                Start free check
              </button>
            </div>
          ) : null}

          {phase === "questions" ? (
            <div className="questionShell" ref={livePanelRef} tabIndex={-1}>
              <div className="progressMeta">
                <span>
                  Quick check {quickCheckStep} of 5
                </span>
                <span>{progress}%</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progress}%` }} />
              </div>

              <div className="questionArea">
                <span className="sectionLabel">This takes around 30 seconds</span>
                <h2 ref={questionHeadingRef} tabIndex={-1}>{step.title}</h2>
                <p>{step.description}</p>
                {shouldShowProgressMessage ? <span className="questionHint momentumHint">{progressMessage}</span> : null}
                {step.reason ? <span className="questionHint">{step.reason}</span> : null}

                {step.kind === "text" ? (
                  <div className="textareaWrap">
                    <textarea
                      className="textarea"
                      placeholder={step.placeholder}
                      value={assessment.extraDetail}
                      onChange={(event) => updateSingle("extraDetail", event.target.value)}
                    />
                    <span className="questionHint">Optional, but this helps make the result more precise.</span>
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
                  {stepIndex === totalSteps - 1 ? "Get my desk score" : "Continue"}
                </button>
              </div>
            </div>
          ) : null}

          {phase === "loading" ? (
            <div className="loadingState" aria-live="polite" ref={livePanelRef} tabIndex={-1}>
              <div className="thinkingOrb" />
              <span className="sectionLabel">DeskLab is checking your setup</span>
              <h2>{loadingMessages[loadingIndex]}</h2>
              <p>Turning your answers into a clear score and what to fix first.</p>
            </div>
          ) : null}

          {phase === "result" && result ? (
            <div className="resultShell" ref={livePanelRef} tabIndex={-1}>
              <div className="resultHero">
                <div className="scoreCard">
                  <span className="sectionLabel">Your desk score</span>
                  <span className={`scoreTag ${getScoreAccent(result.score)}`}>{getScoreLabel(result.score)}</span>
                  <div className="score">
                    {result.score}
                  </div>
                  <p>out of 100</p>
                  <div className="confidencePill qualityPill">{getConfidenceSupport(result)}</div>
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
                      <span className="sectionLabel">Biggest issue</span>
                      <h2>{humanizeConstraint(result.primaryConstraint)}</h2>
                    </div>
                    <div className="pillStack">
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
                    <summary>Why this matters</summary>
                    {getWhyBlocks(result).map((block) => (
                      <div key={`${block.label}-${block.text}`}>
                        <strong>{block.icon} {block.label}</strong>
                        <p>{block.text}</p>
                      </div>
                    ))}
                    {result.moreDetailPrompt ? <p>{humanizeCopy(result.moreDetailPrompt)}</p> : null}
                  </details>
                </div>
              </div>

              {revealStage >= 2 ? (
                <div className="resultGrid revealBlock isVisible">
                  <div className="resultBlock">
                    <span className="blockLabel">Fix this first</span>
                    <ul className="cleanList">
                      {scoreImprovements.slice(0, 3).map((item, index) => (
                        <li key={`${item.action}-${item.scoreLabel}`}>
                          <strong>{index === 0 ? "Start here: " : ""}{getCueIcon(item.action)} {humanizeCopy(item.action)}</strong>
                          <span>Benefit: {humanizeCopy(item.effect)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="resultBlock">
                    <span className="blockLabel">Biggest improvements</span>
                    <ul className="cleanList">
                      {scoreImprovements.slice(0, 4).map((item, index) => (
                        <li key={`${item.action}-${item.scoreLabel}-gain`}>
                          {getCueIcon(item.action)} {humanizeCopy(item.action)}  <strong>+{getGainEstimate(result, item.scoreLabel, index)} {getScoreName(item.scoreLabel)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {revealStage >= 4 ? (
                <div className="productsSection revealBlock isVisible">
                  <div className="sectionIntro compactIntro">
                    <span className="sectionLabel">Recommended for your setup</span>
                    <h2>Each one helps solve a real issue in your setup.</h2>
                  </div>

                  {matchedProducts.length > 0 ? (
                    <div className="productGrid">
                      {matchedProducts.slice(0, 3).map((match) => {
                        const hasProductUrl = Boolean(match.product.url?.trim());
                        const hasProductImage = Boolean(match.product.image?.trim());

                        return (
                          <article className="productCard" key={match.key}>
                            {hasProductImage ? (
                              <div className="productImageWrap">
                                <img
                                  alt={match.product.name}
                                  className="productImage"
                                  loading="eager"
                                  decoding="async"
                                  src={match.product.image}
                                />
                              </div>
                            ) : null}
                            <div className="productTop">
                              <strong>{match.product.name}</strong>
                            </div>
                            <p>{getSimpleProductReason(match)}</p>
                            <div className="productMeta">
                              <span>{match.fitScore}% match</span>
                            </div>
                            {hasProductUrl ? (
                              <a
                                className="secondaryButton"
                                href={match.product.url}
                                rel="noreferrer"
                                target="_blank"
                                onClick={() => trackDeskLabEvent({ event_name: "product_clicked", product_name: match.product.name })}
                              >
                                Shop this fix
                              </a>
                            ) : (
                              <span className="questionHint">Coming soon</span>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rationalePanel">
                      <span className="sectionLabel">No product needed yet</span>
                      <p>Start with the setup changes above. They should improve the score faster than buying more.</p>
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
