import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeskLab",
  description: "DeskLab by Urban Marketplace helps people diagnose workspace friction and take clearer next steps.",
  icons: {
    icon: [{ url: "/favicon.ico?v=1", type: "image/x-icon" }],
    shortcut: [{ url: "/favicon.ico?v=1", type: "image/x-icon" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
