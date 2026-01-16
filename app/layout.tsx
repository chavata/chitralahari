import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Chitralahari - Telugu Movie Puzzle",
  description: "Daily Telugu movie guessing game with Wordle-style feedback."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}

