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
    title: "What are you working from?",
    description: "Your screen setup changes what is realistic straight away.",
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
    title: "How does the desk feel right now?",
    description: "Choose the signals that genuinely match your setup.",
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
    title: "What is actively getting in the way?",
    description: "This helps separate surface symptoms from the real constraints.",
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
    title: "What do you want to improve first?",
    description: "DeskLab will weight the recommendation around this priority.",
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
    title: "How open are you to buying anything?",
    description: "The advice should match your appetite to spend.",
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
    title: "How much desk space are you working with?",
    description: "Surface area changes what is genuinely worth recommending.",
    options: ["Very small", "Small", "Medium", "Large"] satisfies readonly DeskSize[],
    required: true
  },
  {
    id: "workStyle",
    kind: "single",
    title: "What type of work happens here most often?",
    description: "The right desk for deep work is different from the right desk for admin or creative work.",
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
    title: "What budget feels sensible?",
    description: "This keeps the recommendation practical.",
    options: ["Under 50", "50-150", "150-300", "300+"] satisfies readonly BudgetBand[],
    required: true
  },
  {
    id: "extraDetail",
    kind: "text",
    title: "Anything else worth knowing?",
    description: "A short note helps DeskLab pick up layout, lighting, storage, and strain signals.",
    placeholder:
      "Example: Small desk, weak evening light, visible cables, limited storage, slight neck strain, and I want it to feel cleaner and calmer.",
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