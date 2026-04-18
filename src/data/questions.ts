import type {
  BudgetBand,
  CurrentFeel,
  DeskSize,
  DeviceType,
  Problem,
  Priority,
  QuestionStep,
  UpgradeIntent,
  WorkStyle
} from "@/types/assessment";

export const assessmentSteps: QuestionStep[] = [
  {
    id: "deviceType",
    kind: "single",
    title: "What setup are you using?",
    description: "Screen layout changes the diagnosis quickly.",
    options: [
      "Laptop only",
      "Laptop and monitor",
      "Single external monitor",
      "Dual monitors"
    ] satisfies readonly DeviceType[],
    required: true
  },
  {
    id: "currentFeel",
    kind: "multi",
    title: "How does your workspace feel right now?",
    description: "Choose the signals that feel true.",
    options: [
      "Cluttered",
      "Uncomfortable",
      "Too dark",
      "Too cramped",
      "Looks flat",
      "Hard to focus"
    ] satisfies readonly CurrentFeel[],
    required: true
  },
  {
    id: "problems",
    kind: "multi",
    title: "What problems are you actively dealing with?",
    description: "This helps separate symptoms from root issues.",
    options: [
      "Neck or back discomfort",
      "Poor lighting",
      "Not enough space",
      "Cable clutter",
      "Hard to focus",
      "Does not feel premium"
    ] satisfies readonly Problem[],
    required: true
  },
  {
    id: "priority",
    kind: "single",
    title: "What matters most right now?",
    description: "This tells DeskLab what to optimise for.",
    options: [
      "Better comfort",
      "Cleaner setup",
      "Better focus",
      "More premium look"
    ] satisfies readonly Priority[],
    required: true
  },
  {
    id: "upgradeIntent",
    kind: "single",
    title: "How open are you to upgrades?",
    description: "We keep the advice aligned with your appetite to buy.",
    options: [
      "Free improvements first",
      "A few practical upgrades",
      "A cleaner premium setup",
      "Not sure yet"
    ] satisfies readonly UpgradeIntent[],
    required: true
  },
  {
    id: "deskSize",
    kind: "single",
    title: "How much surface space do you have?",
    description: "Space changes what is realistic.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "workStyle",
    kind: "single",
    title: "What kind of work happens here most often?",
    description: "Different work patterns need different setups.",
    options: [
      "Deep focus work",
      "Meetings and admin",
      "Creative work",
      "Mixed use"
    ] satisfies readonly WorkStyle[],
    required: true
  },
  {
    id: "budgetBand",
    kind: "single",
    title: "What budget feels realistic?",
    description: "So the recommendations stay grounded.",
    options: ["Under 50", "50-150", "150-300", "300+"] satisfies readonly BudgetBand[],
    required: true
  },
  {
    id: "extraDetail",
    kind: "text",
    title: "Describe your workspace in a little more detail",
    description: "Anything else that feels off?",
    placeholder:
      "Example: Small desk, poor evening lighting, visible cables, limited storage, slight neck strain, and I want it to feel cleaner and more intentional.",
    required: false
  }
];

export const emptyAssessment = {
  deviceType: "",
  currentFeel: [],
  problems: [],
  priority: "",
  upgradeIntent: "",
  deskSize: "",
  workStyle: "",
  budgetBand: "",
  extraDetail: ""
} as const;
