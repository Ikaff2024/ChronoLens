import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "ChronoLens OSINT",
  description: "Temporal investigation workspace"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
