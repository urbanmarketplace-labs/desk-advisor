import type { ProductCatalogItem } from "@/types/assessment";

export const productCatalog: ProductCatalogItem[] = [
  {
    name: "Monitor Light Bar",
    category: "lighting",
    priceBand: "50-150",
    benefits: ["Puts cleaner light on the work area", "Makes evening work easier", "Does not take up desk space"],
    bestFor: ["Poor lighting", "Deep focus work", "Small desks"],
    avoidIf: ["Lighting is already strong and balanced"],
    spaceImpact: "low",
    styleFit: "clean"
  },
  {
    name: "Wool Desk Mat",
    category: "surface",
    priceBand: "50-150",
    benefits: ["Creates a clearer work zone", "Makes the desk feel more finished", "Adds structure to the surface"],
    bestFor: ["Cleaner setup", "More premium look", "Looks flat"],
    avoidIf: ["Desk surface is already too crowded"],
    spaceImpact: "medium",
    styleFit: "premium"
  },
  {
    name: "Monitor Stand",
    category: "ergonomics",
    priceBand: "50-150",
    benefits: ["Lifts the screen", "Frees up desk space", "Makes the layout easier to organise"],
    bestFor: ["Neck or back discomfort", "Not enough space", "Dual monitors"],
    avoidIf: ["Monitor is already correctly positioned"],
    spaceImpact: "medium",
    styleFit: "clean"
  },
  {
    name: "Cable Management Kit",
    category: "organization",
    priceBand: "Under 50",
    benefits: ["Gets loose cables out of sight", "Makes the desk feel cleaner quickly", "Removes visual distraction"],
    bestFor: ["Cable clutter", "Cleaner setup", "Hard to focus"],
    avoidIf: ["Cables are already hidden and routed cleanly"],
    spaceImpact: "low",
    styleFit: "utility"
  },
  {
    name: "Laptop Stand",
    category: "ergonomics",
    priceBand: "50-150",
    benefits: ["Raises the laptop screen", "Takes strain off the neck", "Works best with an external keyboard and mouse"],
    bestFor: ["Laptop only", "Neck or back discomfort", "Better comfort"],
    avoidIf: ["Laptop is not part of the main setup"],
    spaceImpact: "low",
    styleFit: "clean"
  },
  {
    name: "LumoMist Diffuser",
    category: "wellbeing",
    priceBand: "50-150",
    benefits: ["Adds a calmer feel", "Works as a finishing touch", "Helps the setup feel more considered"],
    bestFor: ["More premium look", "Calmer environment", "Post-refinement upgrade"],
    avoidIf: ["Core ergonomic or lighting issues are unresolved"],
    spaceImpact: "low",
    styleFit: "premium"
  }
];
