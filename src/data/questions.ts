import type {
  DeskDensity,
  DeskSize,
  FrictionSignal,
  LightingQuality,
  QuestionStep,
  SetupType,
  TimeExposure,
  UpgradeIntent
} from "@/types/assessment";

export const assessmentSteps: QuestionStep[] = [
  {
    id: "timeExposure",
    kind: "single",
    title: "How long do you spend at your desk daily?",
    description: "The longer you are there, the more comfort and lighting matter.",
    options: ["<2h", "2-4h", "4-8h", "8h+"] satisfies readonly TimeExposure[],
    required: true
  },
  {
    id: "setupType",
    kind: "single",
    title: "What kind of setup are you working from?",
    description: "Screen position changes the quality of the whole setup.",
    options: [
      "Laptop only",
      "Laptop raised",
      "External monitor",
      "Multi-monitor"
    ] satisfies readonly SetupType[],
    required: true
  },
  {
    id: "frictionSignals",
    kind: "multi",
    title: "What feels most off about your setup?",
    description: "Choose up to two. Pick the strongest signals, not everything that sounds familiar.",
    options: [
      "Space feels limited",
      "Looks cluttered",
      "Physical discomfort",
      "Lighting is not good",
      "Hard to focus",
      "Nothing obvious"
    ] satisfies readonly FrictionSignal[],
    required: true,
    maxSelections: 2
  },
  {
    id: "deskDensity",
    kind: "single",
    title: "How full does your desk feel?",
    description: "Density changes both focus and usable space.",
    options: ["Minimal", "Moderate", "Busy", "Overloaded"] satisfies readonly DeskDensity[],
    required: true
  },
  {
    id: "lightingQuality",
    kind: "single",
    title: "How would you describe your lighting?",
    description: "A setup can look fine and still be tiring to work from.",
    options: [
      "Even and bright",
      "Usable but inconsistent",
      "Dim / shadowy",
      "Changes throughout the day"
    ] satisfies readonly LightingQuality[],
    required: true
  },
  {
    id: "deskSize",
    kind: "single",
    title: "How much desk space are you working with?",
    description: "Space changes what is realistic and what will just add pressure.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "upgradeIntent",
    kind: "single",
    title: "How open are you to changing or buying anything?",
    description: "DeskLab should match your appetite for change.",
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
    title: "Anything specific about your setup or work we should consider?",
    description: "Optional, but a useful note helps DeskLab be more certain and more specific.",
    placeholder:
      "Example: I work long hours from a small desk, my light changes in the afternoon, and I get neck tension by the end of the day.",
    required: false
  }
];

export const emptyAssessment = {
  timeExposure: "",
  setupType: "",
  frictionSignals: [],
  deskDensity: "",
  lightingQuality: "",
  deskSize: "",
  upgradeIntent: "",
  extraDetail: ""
} as const;
