import type {
  AssessmentInput,
  DeskDensity,
  DeskSize,
  FocusPattern,
  FrictionSignal,
  InputDeviceSetup,
  LightTiming,
  LightingQuality,
  PrioritySignal,
  QuestionStep,
  ScreenPosition,
  SetupType,
  SurfaceUse,
  TimeExposure,
  UpgradeIntent,
  WorkStyle
} from "@/types/assessment";

const baseSteps: QuestionStep[] = [
  {
    id: "setupType",
    kind: "single",
    title: "What are you working on?",
    description: "This gives DeskLab a quick read on comfort, space, and screen setup.",
    options: [
      "Laptop only",
      "Laptop + external monitor",
      "Single external monitor",
      "Dual monitor",
      "Other / mixed"
    ] satisfies readonly SetupType[],
    required: true
  },
  {
    id: "timeExposure",
    kind: "single",
    title: "How long are you at your desk each day?",
    description: "Longer sessions make small setup issues matter more.",
    options: ["Under 2 hours", "2-4 hours", "4-8 hours", "8+ hours"] satisfies readonly TimeExposure[],
    required: true
  },
  {
    id: "frictionSignals",
    kind: "multi",
    title: "What bothers you most?",
    description: "Choose up to two so DeskLab can focus on the right problem first.",
    options: [
      "Discomfort / strain",
      "Low light / poor visibility",
      "Clutter / visual noise",
      "Space feels limited",
      "Hard to focus",
      "Setup feels flat / unfinished",
      "Nothing obvious, just feels off"
    ] satisfies readonly FrictionSignal[],
    required: true,
    maxSelections: 2
  },
  {
    id: "deskDensity",
    kind: "single",
    title: "How full does your desk feel?",
    description: "This shows whether clutter or limited space is getting in the way.",
    options: ["Minimal", "Moderate", "Busy", "Overloaded"] satisfies readonly DeskDensity[],
    required: true
  },
  {
    id: "lightingQuality",
    kind: "single",
    title: "Is your desk well lit?",
    description: "Good lighting makes work feel easier, especially over longer sessions.",
    options: [
      "Bright and even",
      "Mostly okay",
      "Dim / shadowy",
      "Changes throughout the day"
    ] satisfies readonly LightingQuality[],
    required: true
  },
  {
    id: "whatMattersMost",
    kind: "single",
    title: "What do you want to improve first?",
    description: "This helps DeskLab order the advice around what matters most to you.",
    options: [
      "Comfort",
      "Focus",
      "Cleaner look",
      "Better use of space",
      "More premium feel"
    ] satisfies readonly PrioritySignal[],
    required: true
  },
  {
    id: "workStyle",
    kind: "single",
    title: "What kind of work happens here most?",
    description: "Different work puts different pressure on the same desk.",
    options: [
      "Deep focus / knowledge work",
      "Meetings and admin",
      "Creative / visual work",
      "Mixed workday",
      "Prefer not to say"
    ] satisfies readonly WorkStyle[],
    required: true
  },
  {
    id: "deskSize",
    kind: "single",
    title: "How much desk space do you have?",
    description: "Smaller desks need a cleaner setup to stay easy to use.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "upgradeIntent",
    kind: "single",
    title: "How much do you want to change?",
    description: "DeskLab should not push products if a simple setup fix will do more.",
    options: [
      "Free improvements first",
      "A few practical upgrades",
      "Open to bigger changes"
    ] satisfies readonly UpgradeIntent[],
    required: true
  }
];

const ergonomicFollowUps: QuestionStep[] = [
  {
    id: "screenPosition",
    kind: "single",
    title: "Where is your main screen while you work?",
    description: "This shows whether screen height may be making you look down or reach awkwardly.",
    options: ["Below eye level", "Roughly eye level", "Above eye level", "Not sure"] satisfies readonly ScreenPosition[],
    required: true,
    reason: "Asked because comfort looks like a likely issue."
  },
  {
    id: "inputDevices",
    kind: "single",
    title: "What do you use for typing and pointing?",
    description: "Screen height only helps if your hands can stay in a comfortable position too.",
    options: [
      "Built-in laptop keyboard / trackpad",
      "External keyboard and mouse",
      "Some external input devices",
      "Not sure"
    ] satisfies readonly InputDeviceSetup[],
    required: true,
    reason: "Asked to see whether the issue is screen height, reach, or both."
  }
];

const pressureFollowUp: QuestionStep = {
  id: "surfaceUse",
  kind: "single",
  title: "What usually stays on the desk while you work?",
  description: "This shows whether the desk only looks busy or is actually short on working room.",
  options: [
    "Only essentials stay out",
    "A few extras stay out",
    "Storage spills onto the desk",
    "Work tools and personal items compete"
  ] satisfies readonly SurfaceUse[],
  required: true,
  reason: "Asked because usable space may be the real issue."
};

const lightingFollowUp: QuestionStep = {
  id: "lightTiming",
  kind: "single",
  title: "When does the lighting feel weakest?",
  description: "This helps DeskLab work out whether the fix is placement, timing, or extra light.",
  options: [
    "Consistent all day",
    "Worse in the morning",
    "Worse in the afternoon",
    "Worse at night",
    "Not sure"
  ] satisfies readonly LightTiming[],
  required: true,
  reason: "Asked because lighting could be improved."
};

const focusFollowUp: QuestionStep = {
  id: "focusPattern",
  kind: "single",
  title: "When does your desk make focus harder?",
  description: "This helps separate clutter, lighting, and long-session fatigue.",
  options: [
    "I lose focus when the desk looks busy",
    "I lose focus when lighting changes",
    "I lose focus during long sessions",
    "The desk is not the main focus issue",
    "Not sure"
  ] satisfies readonly FocusPattern[],
  required: true,
  reason: "Asked because focus looks like part of the problem."
};

const refinementStep: QuestionStep = {
  id: "extraDetail",
  kind: "text",
  title: "Anything else we should know?",
  description: "Optional, but this helps make the result more specific.",
  placeholder:
    "Example: Small desk, afternoon glare, lots of calls, and my neck feels tight by the end of the day.",
  required: false,
  reason: "Asked because a short note makes the result sharper."
};

export function shouldAskErgonomicFollowUp(input: AssessmentInput): boolean {
  return (
    input.setupType === "Laptop only" ||
    input.frictionSignals.includes("Discomfort / strain") ||
    ((input.timeExposure === "4-8 hours" || input.timeExposure === "8+ hours") && input.setupType.includes("Laptop"))
  );
}

export function shouldAskPressureFollowUp(input: AssessmentInput): boolean {
  return (
    input.deskDensity === "Busy" ||
    input.deskDensity === "Overloaded" ||
    input.deskSize === "Very small" ||
    input.deskSize === "Small" ||
    input.setupType === "Dual monitor" ||
    input.frictionSignals.includes("Space feels limited") ||
    input.frictionSignals.includes("Clutter / visual noise")
  );
}

export function shouldAskLightingFollowUp(input: AssessmentInput): boolean {
  return (
    input.lightingQuality === "Dim / shadowy" ||
    input.lightingQuality === "Changes throughout the day" ||
    input.frictionSignals.includes("Low light / poor visibility")
  );
}

export function shouldAskFocusFollowUp(input: AssessmentInput): boolean {
  return (
    input.workStyle === "Deep focus / knowledge work" ||
    input.frictionSignals.includes("Hard to focus") ||
    input.frictionSignals.includes("Clutter / visual noise") ||
    input.deskDensity === "Overloaded"
  );
}

function needsRefinement(input: AssessmentInput): boolean {
  return (
    input.frictionSignals.includes("Nothing obvious, just feels off") ||
    input.workStyle === "Prefer not to say" ||
    input.extraDetail.trim().length === 0
  );
}

export function getAdaptiveAssessmentSteps(input: AssessmentInput): QuestionStep[] {
  const steps = [...baseSteps];

  if (shouldAskErgonomicFollowUp(input)) {
    steps.push(...ergonomicFollowUps);
  }

  if (shouldAskPressureFollowUp(input)) {
    steps.push(pressureFollowUp);
  }

  if (shouldAskLightingFollowUp(input)) {
    steps.push(lightingFollowUp);
  }

  if (shouldAskFocusFollowUp(input)) {
    steps.push(focusFollowUp);
  }

  if (needsRefinement(input)) {
    steps.push(refinementStep);
  }

  return steps;
}

export const assessmentSteps = baseSteps;

export const emptyAssessment: AssessmentInput = {
  setupType: "",
  timeExposure: "",
  frictionSignals: [],
  deskDensity: "",
  lightingQuality: "",
  whatMattersMost: "",
  workStyle: "",
  deskSize: "",
  upgradeIntent: "",
  screenPosition: "",
  inputDevices: "",
  surfaceUse: "",
  lightTiming: "",
  focusPattern: "",
  extraDetail: ""
};
