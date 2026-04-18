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
    description: "Your screen layout is one of the strongest ergonomic signals.",
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
    description: "Pick the signals that best describe the current setup.",
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
    description: "These help us separate surface-level symptoms from real friction.",
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
    description: "This becomes the tie-breaker when several fixes could work.",
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
    description: "This helps us avoid pushing products when behavior changes should come first.",
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
    description: "Desk size changes what counts as a realistic recommendation.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "workStyle",
    kind: "single",
    title: "What kind of work happens here most often?",
    description: "We can recommend differently for deep work than for light admin use.",
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
    description: "This keeps product recommendations honest and useful.",
    options: ["Under 50", "50-150", "150-300", "300+"] satisfies readonly BudgetBand[],
    required: true
  },
  {
    id: "extraDetail",
    kind: "text",
    title: "Describe your workspace in a little more detail",
    description: "Mention lighting, cables, discomfort, storage, premium feel, or anything else that feels off.",
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
