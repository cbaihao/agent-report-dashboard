import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent OS Report",
  description: "Live dashboard — theses, agent queue, human TODOs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
