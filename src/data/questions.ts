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
    title: "What kind of setup are you working from?",
    description: "This gives DeskLab the first read on posture, surface pressure, and setup complexity.",
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
    title: "How long do you spend at your desk daily?",
    description: "Longer sessions make small comfort and lighting problems matter more.",
    options: ["Under 2 hours", "2-4 hours", "4-8 hours", "8+ hours"] satisfies readonly TimeExposure[],
    required: true
  },
  {
    id: "frictionSignals",
    kind: "multi",
    title: "What feels most off about your setup?",
    description: "Choose up to two. DeskLab uses this to decide what to investigate next.",
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
    description: "Desk load affects both focus and usable surface area.",
    options: ["Minimal", "Moderate", "Busy", "Overloaded"] satisfies readonly DeskDensity[],
    required: true
  },
  {
    id: "lightingQuality",
    kind: "single",
    title: "How would you describe your lighting?",
    description: "Weak or inconsistent light often shows up as focus drag before people notice the light itself.",
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
    title: "What matters most right now?",
    description: "This shapes the recommendation order, unless a stronger constraint needs to override it.",
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
    title: "What kind of work mainly happens here?",
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
    title: "How much desk space are you working with?",
    description: "A small desk can still work well, but it has less tolerance for extra objects.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "upgradeIntent",
    kind: "single",
    title: "How open are you to changing or buying anything?",
    description: "DeskLab should not recommend products before the basics are clear.",
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
    description: "This checks whether comfort risk is coming from looking down, reaching, or screen placement.",
    options: ["Below eye level", "Roughly eye level", "Above eye level", "Not sure"] satisfies readonly ScreenPosition[],
    required: true,
    reason: "Asked because your answers point to possible comfort strain."
  },
  {
    id: "inputDevices",
    kind: "single",
    title: "What do you use for typing and pointing?",
    description: "A raised screen only helps if your hands can stay in a relaxed position too.",
    options: [
      "Built-in laptop keyboard / trackpad",
      "External keyboard and mouse",
      "Some external input devices",
      "Not sure"
    ] satisfies readonly InputDeviceSetup[],
    required: true,
    reason: "Asked to separate screen-height issues from reach and input-position issues."
  }
];

const pressureFollowUp: QuestionStep = {
  id: "surfaceUse",
  kind: "single",
  title: "What usually stays on the desk while you work?",
  description: "This separates a busy-looking desk from a desk that is genuinely short on working room.",
  options: [
    "Only essentials stay out",
    "A few extras stay out",
    "Storage spills onto the desk",
    "Work tools and personal items compete"
  ] satisfies readonly SurfaceUse[],
  required: true,
  reason: "Asked because your setup may have surface pressure."
};

const lightingFollowUp: QuestionStep = {
  id: "lightTiming",
  kind: "single",
  title: "When does the lighting feel weakest?",
  description: "Timing matters because a fixed desk lamp, screen light, or layout change solves different lighting problems.",
  options: [
    "Consistent all day",
    "Worse in the morning",
    "Worse in the afternoon",
    "Worse at night",
    "Not sure"
  ] satisfies readonly LightTiming[],
  required: true,
  reason: "Asked because lighting is affecting the diagnosis."
};

const focusFollowUp: QuestionStep = {
  id: "focusPattern",
  kind: "single",
  title: "When does the desk affect your focus most?",
  description: "This checks whether the focus issue is coming from visual noise, light, duration, or something outside the desk.",
  options: [
    "I lose focus when the desk looks busy",
    "I lose focus when lighting changes",
    "I lose focus during long sessions",
    "The desk is not the main focus issue",
    "Not sure"
  ] satisfies readonly FocusPattern[],
  required: true,
  reason: "Asked because your answers point to focus fragility."
};

const refinementStep: QuestionStep = {
  id: "extraDetail",
  kind: "text",
  title: "Add one useful detail so DeskLab does not overreach.",
  description: "Optional, but this is how the diagnosis becomes more specific instead of staying cautious.",
  placeholder:
    "Example: I work 8 hours from a small desk, use calls often, lose light in the afternoon, and my neck gets tight by the end of the day.",
  required: false,
  reason: "Asked because limited detail lowers diagnosis confidence."
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
