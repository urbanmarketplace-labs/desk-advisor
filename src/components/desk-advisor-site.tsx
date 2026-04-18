"use client";

import { useMemo, useState } from "react";
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
  if (score < 50) return "High friction";
  if (score < 75) return "Moderate friction";
  return "Low friction";
}

export function DeskAdvisorSite() {
  const [assessment, setAssessment] = useState<AssessmentInput>({
    ...emptyAssessment,
    currentFeel: [],
    problems: []
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const step = assessmentSteps[stepIndex];
  const totalSteps = assessmentSteps.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const canContinue = useMemo(() => {
    return isStepComplete(step.id, assessment[step.id]);
  }, [assessment, step.id]);

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
    setHasStarted(true);
    setResult(null);
    setStepIndex(0);
  }

  function goNext() {
    if (!canContinue) {
      return;
    }

    if (stepIndex === totalSteps - 1) {
      setResult(diagnoseWorkspace(assessment));
      return;
    }

    setStepIndex((current) => current + 1);
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function restart() {
    setAssessment({
      ...emptyAssessment,
      currentFeel: [],
      problems: []
    });
    setResult(null);
    setHasStarted(false);
    setStepIndex(0);
  }

  const matchedProducts = result?.matchedProducts ?? [];

  return (
    <main className="page">
      <section className="hero">
        <div className="card heroCopy heroCardLarge">
          <span className="eyebrow">Personalised workspace diagnosis</span>
          <h1>Desk advice that feels intelligent, not generic.</h1>
          <p>
            DeskLab helps customers understand what is actually wrong with their setup, what to fix first, and which
            products are genuinely worth considering. The experience below is the first real website flow built on the
            new structured diagnosis engine.
          </p>
          <div className="heroActions">
            <button className="primaryButton" type="button" onClick={startAssessment}>
              Start your assessment
            </button>
            <a className="secondaryButton" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="pillRow">
            <span className="pill">Free fixes first</span>
            <span className="pill">Smarter product matching</span>
            <span className="pill">AI-ready foundation</span>
          </div>
        </div>

        <div className="card heroPanel">
          <h2 className="kicker">What makes this stronger than a quiz</h2>
          <div className="stack">
            <div className="stepCard">
              <strong>Structured diagnosis</strong>
              <span className="muted">The system identifies issues, confidence, causes, and recommendation priority.</span>
            </div>
            <div className="stepCard">
              <strong>Constraint-aware advice</strong>
              <span className="muted">Desk size, work style, budget, and intent shape what the user sees next.</span>
            </div>
            <div className="stepCard">
              <strong>Product logic that can grow</strong>
              <span className="muted">Products are matched by category, fit, and use case instead of being dropped in at random.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="gridThree" id="how-it-works">
        <div className="card section miniFeature">
          <strong>1. Diagnose the setup</strong>
          <p>Customers answer a short but more nuanced set of questions about comfort, focus, lighting, and constraints.</p>
        </div>
        <div className="card section miniFeature">
          <strong>2. Prioritise the fixes</strong>
          <p>The engine separates free behavioral improvements from worthwhile upgrades so the guidance feels trustworthy.</p>
        </div>
        <div className="card section miniFeature">
          <strong>3. Guide the next step</strong>
          <p>Results can later expand into AI summaries, follow-up questions, and product education without rebuilding the foundation.</p>
        </div>
      </section>

      <section className="assessmentLayout">
        <div className="card section assessmentPanel">
          <div className="assessmentHeader">
            <div>
              <div className="sectionEyebrow">Workspace assessment</div>
              <h2 className="sectionTitle">Help customers understand their desk properly.</h2>
              <p>
                This is designed to feel like a premium website experience rather than a dashboard tool. It guides users
                toward clarity, not overwhelm.
              </p>
            </div>
            {hasStarted ? (
              <button className="ghostButton" type="button" onClick={restart}>
                Restart
              </button>
            ) : null}
          </div>

          {!hasStarted ? (
            <div className="introPanel">
              <div className="gridTwo">
                <div className="stepCard">
                  <strong>Customers get</strong>
                  <span className="muted">A diagnosis, a set of priority fixes, and upgrade recommendations with rationale.</span>
                </div>
                <div className="stepCard">
                  <strong>You get</strong>
                  <span className="muted">A better conversion path than a basic landing page because the advice feels considered and useful.</span>
                </div>
              </div>
              <button className="primaryButton" type="button" onClick={startAssessment}>
                Begin assessment
              </button>
            </div>
          ) : result ? (
            <div className="resultShell">
              <div className="resultTop">
                <div className="scoreCard">
                  <div className="mutedOnDark">Workspace score</div>
                  <div className="score">
                    {result.score}
                    <span className="scoreSuffix">/100</span>
                  </div>
                  <div className="scoreLabel">{getScoreLabel(result.score)}</div>
                  <p>{result.summary}</p>
                </div>

                <div className="card resultSummaryCard">
                  <h3>Main issues detected</h3>
                  <div className="issueStack">
                    {result.mainIssues.map((issue) => (
                      <div className="issueCard" key={issue.id}>
                        <strong>{issue.label}</strong>
                        <span className="muted">
                          Severity {issue.severity} / Confidence {Math.round(issue.confidence * 100)}%
                        </span>
                        <p>{issue.causes.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="gridThree resultsGrid">
                <div className="resultCard">
                  <h3>{result.freeFixes.title}</h3>
                  <ul className="miniList">
                    {result.freeFixes.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="resultCard">
                  <h3>{result.paidUpgrades.title}</h3>
                  <ul className="miniList">
                    {result.paidUpgrades.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="resultCard">
                  <h3>Why this result makes sense</h3>
                  <ul className="miniList">
                    {result.whyTheseRecommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card section">
                <div className="assessmentHeader">
                  <div>
                    <div className="sectionEyebrow">Product fit</div>
                    <h3 className="sectionTitle">Products that fit the diagnosis</h3>
                  </div>
                </div>
                <div className="gridThree">
                  {matchedProducts.map((product) => {
                    const metadata = productReasonMap.get(product.name);
                    return (
                      <div className="productShowcase" key={product.name}>
                        <strong>{product.name}</strong>
                        <div className="pillRow compactRow">
                          <span className="pill">{product.fitScore}% fit</span>
                          {metadata ? <span className="pill">{metadata.category}</span> : null}
                          {metadata ? <span className="pill">{metadata.priceBand}</span> : null}
                        </div>
                        <p>{metadata?.benefits.slice(0, 2).join(". ")}</p>
                        <ul className="miniList">
                          {product.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <span className="productComingSoon">Product pages can plug in here once the catalog goes live.</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card section nextStepPanel">
                <div>
                  <div className="sectionEyebrow">Next step</div>
                  <h3 className="sectionTitle">What this becomes next</h3>
                  <p>
                    This result layer is now ready for AI-generated summaries, conversational follow-ups, saved customer
                    plans, and future photo-based workspace diagnosis.
                  </p>
                </div>
                <div className="gridTwo">
                  {result.nextQuestions.map((question) => (
                    <div className="stepCard" key={question}>
                      <strong>Follow-up question</strong>
                      <span className="muted">{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="questionShell">
              <div className="progressMeta">
                <span>
                  Step {stepIndex + 1} of {totalSteps}
                </span>
                <span>{progress}% complete</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progress}%` }} />
              </div>

              <div className="questionArea">
                <h3>{step.title}</h3>
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
          )}
        </div>

        <aside className="card section sideRail">
          <div className="sectionEyebrow">Website direction</div>
          <h2 className="sectionTitle">Built to feel premium on `desklab.uk`.</h2>
          <p>
            This direction keeps the product public-facing and conversion-friendly. It avoids "internal app" energy
            while still giving you an engine strong enough to support smarter recommendations later.
          </p>
          <div className="stack">
            <div className="stepCard">
              <strong>Now</strong>
              <span className="muted">Polished customer journey with structured results.</span>
            </div>
            <div className="stepCard">
              <strong>Next</strong>
              <span className="muted">AI-generated explanation and follow-up Q&A from the structured diagnosis output.</span>
            </div>
            <div className="stepCard">
              <strong>Later</strong>
              <span className="muted">Photo upload and image-assisted workspace diagnosis.</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
