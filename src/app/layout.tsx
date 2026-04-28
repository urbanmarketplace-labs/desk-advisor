import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { META_PIXEL_ID } from "@/lib/meta-pixel";
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
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            alt=""
            height="1"
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            style={{ display: "none" }}
            width="1"
          />
        </noscript>
        <Analytics />
      </body>
    </html>
  );
}
