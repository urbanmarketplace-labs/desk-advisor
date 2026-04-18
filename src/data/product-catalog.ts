import type { ProductCatalogItem } from "@/types/assessment";

export const productCatalog: ProductCatalogItem[] = [
  {
    name: "Monitor Light Bar",
    category: "lighting",
    priceBand: "50-150",
    benefits: ["Improves task lighting", "Reduces screen-area darkness", "Supports evening work"],
    bestFor: ["Poor lighting", "Deep focus work", "Small desks"],
    avoidIf: ["Lighting is already strong and balanced"],
    spaceImpact: "low",
    styleFit: "clean"
  },
  {
    name: "Wool Desk Mat",
    category: "surface",
    priceBand: "50-150",
    benefits: ["Creates visual hierarchy", "Improves premium feel", "Defines a clear work zone"],
    bestFor: ["Cleaner setup", "More premium look", "Looks flat"],
    avoidIf: ["Desk surface is already too crowded"],
    spaceImpact: "medium",
    styleFit: "premium"
  },
  {
    name: "Monitor Stand",
    category: "ergonomics",
    priceBand: "50-150",
    benefits: ["Raises screen height", "Recovers surface area", "Creates stronger layout structure"],
    bestFor: ["Neck or back discomfort", "Not enough space", "Dual monitors"],
    avoidIf: ["Monitor is already correctly positioned"],
    spaceImpact: "medium",
    styleFit: "clean"
  },
  {
    name: "Cable Management Kit",
    category: "organization",
    priceBand: "Under 50",
    benefits: ["Reduces visual noise", "Improves cleanliness quickly", "Supports better focus"],
    bestFor: ["Cable clutter", "Cleaner setup", "Hard to focus"],
    avoidIf: ["Cables are already hidden and routed cleanly"],
    spaceImpact: "low",
    styleFit: "utility"
  },
  {
    name: "Laptop Stand",
    category: "ergonomics",
    priceBand: "50-150",
    benefits: ["Improves screen height", "Supports posture", "Pairs well with external keyboard use"],
    bestFor: ["Laptop only", "Neck or back discomfort", "Better comfort"],
    avoidIf: ["Laptop is not part of the main setup"],
    spaceImpact: "low",
    styleFit: "clean"
  },
  {
    name: "LumoMist Diffuser",
    category: "wellbeing",
    priceBand: "50-150",
    benefits: ["Adds atmosphere", "Supports a calmer feel", "Works as a finishing touch"],
    bestFor: ["More premium look", "Calmer environment", "Post-refinement upgrade"],
    avoidIf: ["Core ergonomic or lighting issues are unresolved"],
    spaceImpact: "low",
    styleFit: "premium"
  }
];
