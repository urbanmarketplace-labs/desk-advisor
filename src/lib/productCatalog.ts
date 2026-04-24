export const productCatalog = {
  lumomist_diffuser: {
    name: "LumoMist Glow Diffuser",
    url: "https://urbanmarket-place.com/products/lumomist-glow-desk-diffuser",
    image: "https://urbanmarket-place.com/cdn/shop/files/aromadiffuser_mit_aetherischem_oel_von_vorne_Crystalli2437_720x720_cae05410-17a3-47aa-9754-d90bc099ad96.webp?v=1764427194",
    intro: "A compact diffuser that adds calm and soft atmosphere to the desk.",
    details: "Best once the practical setup issues are handled and you want the space to feel more finished."
  },
  charging_station: {
    name: "3-in-1 Charging Station",
    url: "https://urbanmarket-place.com/products/3-in-1-wireless-charger-stand-for-iphone-12-13-14-15-16-fast-charging-station-for-apple-watch-10-9-8-7-6-5-4-airpods-2-3-pro",
    image: "https://urbanmarket-place.com/cdn/shop/files/AppleCharginStationMain.png?v=1746551380",
    intro: "A single charging point that replaces loose cables and scattered chargers.",
    details: "Useful when the desk feels busy and you want everyday devices to take up less visual space."
  },
  leather_desk_mat: {
    name: "Leather Desk Mat",
    url: "https://urbanmarket-place.com/products/premium-leather-desk-pad",
    image: "https://urbanmarket-place.com/cdn/shop/files/ChatGPT_Image_Apr_13_2025_11_51_40_AM.png?v=1746551424",
    intro: "A clean desk base that visually defines the main work zone.",
    details: "Helps the surface feel calmer and more deliberate, especially when the desk lacks structure."
  },
  wooden_tablet_stand: {
    name: "Wooden Tablet Stand",
    url: "https://urbanmarket-place.com/products/wooden-tablet-stand-minimalist-hands-free-holder",
    image: "https://urbanmarket-place.com/cdn/shop/files/WoodenTabletStandBW2.png?v=1746551439",
    intro: "A simple stand that gets a tablet off the surface and into a tidy fixed position.",
    details: "Helpful when secondary devices are eating into usable space or making the setup look less ordered."
  },
  monitor_light_bar: {
    name: "Monitor Light Bar",
    url: "https://urbanmarket-place.com/products/minimalist-monitor-light-bar",
    image: "https://urbanmarket-place.com/cdn/shop/files/MOnitorlightbar3.png?v=1748599010",
    intro: "A glare-controlled light that improves visibility without taking up desk room.",
    details: "A strong fit when lighting is weak, uneven, or changes too much through the day."
  },
  monitor_stand: {
    name: "Monitor Stand",
    url: "https://urbanmarket-place.com/products/besegad-computer-monitor-stand-riser-multi-function-pc-laptop-holder-wooden-desk-organizer-shelf-easy-assemble-for-home-desktop",
    image: "https://urbanmarket-place.com/cdn/shop/files/White_Monitor_stand_Main.png?v=1746551415",
    intro: "A screen riser that lifts the monitor and frees up surface space underneath.",
    details: "Useful when comfort and space pressure are both showing up in the diagnosis."
  },
  adjustable_laptop_stand: {
    name: "Adjustable Laptop Stand",
    url: "https://urbanmarket-place.com/products/adjustable-aluminum-laptop-stand-portable-folding-desk-riser-monitor-lift-for-home-office",
    image: "https://urbanmarket-place.com/cdn/shop/files/93a7bc1e-4fa2-4744-b123-5913cde779b0.jpg?v=1746551377",
    intro: "An adjustable stand that raises the laptop screen to a more comfortable height.",
    details: "One of the best first upgrades when laptop use and long hours are driving neck strain."
  },
  wooden_laptop_stand: {
    name: "Wooden Laptop Stand",
    url: "https://urbanmarket-place.com/products/universal-wooden-laptop-holder-detachable-base-stand-computer-cooling-bracket-suitable-for-notebook-laptop-tablet-10-17-inchs",
    image: "https://urbanmarket-place.com/cdn/shop/files/BudgetLaptopStand1.png?v=1746551420",
    intro: "A minimal wooden riser that improves screen height and adds visual warmth.",
    details: "A good fit when you want better posture without making the desk feel technical or cluttered."
  },
  cable_management: {
    name: "Cable Management Kit",
    url: "https://urbanmarket-place.com/products/under-desk-cable-management-tray-extendable-sturdy-steel-under-desk-cord-hider-raceway-power-strip-cord-holder-wire-management",
    image: "https://urbanmarket-place.com/cdn/shop/files/S2de887f777044344b102ae202009e68bh.webp?v=1746551413",
    intro: "An under-desk tray that hides cables, chargers, and power strips out of sight.",
    details: "Ideal when visible cable load is making the desk feel messy or harder to focus on."
  },
  headphone_stand: {
    name: "Headphone Stand",
    url: "https://urbanmarket-place.com/products/aluminium-alloy-headphone-stand-holder-rack-space-saving-headset-stand-rack-desktop-organizer-display-earphone-bracket",
    image: "https://urbanmarket-place.com/cdn/shop/files/HeadphoneStandMain.png?v=1746551379",
    intro: "A dedicated place for headphones that clears them off the work surface.",
    details: "A small but useful cleanup move when accessories are adding pressure and visual noise."
  }
} as const;

export type ProductCatalogKey = keyof typeof productCatalog;
export type ProductCatalogValue = (typeof productCatalog)[ProductCatalogKey];
export type ProductCatalogEntry = ProductCatalogValue & { key: ProductCatalogKey };

export const productCatalogEntries: ProductCatalogEntry[] = Object.entries(productCatalog).map(([key, product]) => ({
  key: key as ProductCatalogKey,
  ...product
}));

export function getProductCatalogEntry(key: ProductCatalogKey): ProductCatalogEntry {
  return {
    key,
    ...productCatalog[key]
  };
}
