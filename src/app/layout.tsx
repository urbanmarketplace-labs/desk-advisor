import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeskLab | Fix your desk in 30 seconds",
  description: "Find what is hurting your focus, comfort, or space — then see what to fix first.",
  icons: {
    icon: [{ url: "/favicon.ico?v=1", type: "image/x-icon" }],
    shortcut: [{ url: "/favicon.ico?v=1", type: "image/x-icon" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
