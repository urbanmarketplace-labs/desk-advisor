import type {
  DeskDensity,
  DeskSize,
  FrictionSignal,
  LightingQuality,
  PrioritySignal,
  QuestionStep,
  SetupType,
  TimeExposure,
  UpgradeIntent,
  WorkStyle
} from "@/types/assessment";

export const assessmentSteps: QuestionStep[] = [
  {
    id: "setupType",
    kind: "single",
    title: "What kind of setup are you working from?",
    description: "This sets the baseline for posture, space pressure, and what changes are realistic.",
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
    description: "Longer desk time raises the cost of poor comfort and weak lighting.",
    options: ["Under 2 hours", "2-4 hours", "4-8 hours", "8+ hours"] satisfies readonly TimeExposure[],
    required: true
  },
  {
    id: "frictionSignals",
    kind: "multi",
    title: "What feels most off about your setup?",
    description: "Choose up to two. Pick the strongest signals, not every small annoyance.",
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
    description: "Desk load changes both focus and usable space.",
    options: ["Minimal", "Moderate", "Busy", "Overloaded"] satisfies readonly DeskDensity[],
    required: true
  },
  {
    id: "lightingQuality",
    kind: "single",
    title: "How would you describe your lighting?",
    description: "A setup can look fine and still feel visually tiring to use.",
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
    description: "This helps DeskLab decide where to focus once the core constraints are covered.",
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
    title: "What kind of work do you mainly do here?",
    description: "Optional context about how the desk is used. If none of these fit, choose the mixed option.",
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
    description: "Space changes what is realistic and what will just add more pressure.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "upgradeIntent",
    kind: "single",
    title: "How open are you to changing or buying anything?",
    description: "DeskLab should match your appetite for change, not push beyond it.",
    options: [
      "Free improvements first",
      "A few practical upgrades",
      "Open to bigger changes"
    ] satisfies readonly UpgradeIntent[],
    required: true
  },
  {
    id: "extraDetail",
    kind: "text",
    title: "Tell us anything useful about how you work or what your setup is fighting against.",
    description: "Optional, but this is what turns a solid read into a sharper diagnosis.",
    placeholder:
      "Example: I work long hours from a small desk, take a lot of calls, lose light in the afternoon, and my neck gets tight by the end of the day.",
    required: false
  }
];

export const emptyAssessment = {
  setupType: "",
  timeExposure: "",
  frictionSignals: [],
  deskDensity: "",
  lightingQuality: "",
  whatMattersMost: "",
  workStyle: "",
  deskSize: "",
  upgradeIntent: "",
  extraDetail: ""
} as const;
