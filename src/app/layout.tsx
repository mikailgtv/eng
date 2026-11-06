import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/layout/pwa-register";

export const metadata: Metadata = {
  title: { default: "EnglishBridge — English Training Platform", template: "%s · EnglishBridge" },
  description: "Organizational English learning management system for firefighter shifts and day workers.",
  applicationName: "EnglishBridge",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "EnglishBridge", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
