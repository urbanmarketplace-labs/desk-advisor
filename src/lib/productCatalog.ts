export const productCatalog = {
  lumomist_diffuser: {
    name: "LumoMist Glow Diffuser",
    url: "https://urbanmarket-place.com/products/lumomist-glow-desk-diffuser"
  },
  charging_station: {
    name: "3-in-1 Charging Station",
    url: "https://urbanmarket-place.com/products/3-in-1-wireless-charger-stand-for-iphone-12-13-14-15-16-fast-charging-station-for-apple-watch-10-9-8-7-6-5-4-airpods-2-3-pro"
  },
  leather_desk_mat: {
    name: "Leather Desk Mat",
    url: "https://urbanmarket-place.com/products/premium-leather-desk-pad"
  },
  wooden_tablet_stand: {
    name: "Wooden Tablet Stand",
    url: "https://urbanmarket-place.com/products/wooden-tablet-stand-minimalist-hands-free-holder"
  },
  monitor_light_bar: {
    name: "Monitor Light Bar",
    url: "https://urbanmarket-place.com/products/minimalist-monitor-light-bar"
  },
  monitor_stand: {
    name: "Monitor Stand",
    url: "https://urbanmarket-place.com/products/besegad-computer-monitor-stand-riser-multi-function-pc-laptop-holder-wooden-desk-organizer-shelf-easy-assemble-for-home-desktop"
  },
  adjustable_laptop_stand: {
    name: "Adjustable Laptop Stand",
    url: "https://urbanmarket-place.com/products/adjustable-aluminum-laptop-stand-portable-folding-desk-riser-monitor-lift-for-home-office"
  },
  wooden_laptop_stand: {
    name: "Wooden Laptop Stand",
    url: "https://urbanmarket-place.com/products/universal-wooden-laptop-holder-detachable-base-stand-computer-cooling-bracket-suitable-for-notebook-laptop-tablet-10-17-inchs"
  },
  cable_management: {
    name: "Cable Management Kit",
    url: "https://urbanmarket-place.com/products/under-desk-cable-management-tray-extendable-sturdy-steel-under-desk-cord-hider-raceway-power-strip-cord-holder-wire-management"
  },
  headphone_stand: {
    name: "Headphone Stand",
    url: "https://urbanmarket-place.com/products/aluminium-alloy-headphone-stand-holder-rack-space-saving-headset-stand-rack-desktop-organizer-display-earphone-bracket"
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
