"use client";

import { useEffect, useState } from "react";

export default function TopBarClient() {
  const [showHelp, setShowHelp] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("chitralahari-theme");
    const light = stored === "light";
    setIsLight(light);
    document.documentElement.classList.toggle("light", light);
  }, []);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle("light", next);
    window.localStorage.setItem("chitralahari-theme", next ? "light" : "dark");
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => setShowHelp(true)}
        className="px-3 py-1.5 rounded-md border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
      >
        How to play
      </button>
      <button
        onClick={toggleTheme}
        className="px-3 py-1.5 rounded-md border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
      >
        {isLight ? "Dark mode" : "Light mode"}
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-slate-100">
                How to play
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>
            <div className="text-sm text-slate-300 space-y-3">
              <p>Guess today’s Telugu movie title in 5 attempts.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Each guess must match the title shape.</li>
                <li>Green = correct letter in correct spot.</li>
                <li>Yellow = letter is in the title but wrong spot.</li>
                <li>Gray = letter not in the title.</li>
              </ul>
              <p>
                Hints: Year of release and title shape are shown on top. You’ll
                get the director after 3 guesses, and one cast name after 4.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

