export type TileColor = "green" | "yellow" | "gray";

export function normalizeTeluguTitle(raw: string): string {
  let s = raw.normalize("NFC");
  s = s.replace(/[.,!?؛:;'"“”‘’\-–—(){}\[\]\/\\|@#$%^&*+=<>~`。、！？]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.toLowerCase();
  return s;
}

function toChars(s: string): string[] {
  return Array.from(s);
}

export function compareTitlesWordleStyle(
  answerRaw: string,
  guessRaw: string
): { colors: TileColor[]; correct: boolean } {
  const answerNorm = normalizeTeluguTitle(answerRaw);
  const guessNorm = normalizeTeluguTitle(guessRaw);

  const answer = toChars(answerNorm);
  const guess = toChars(guessNorm);

  const len = Math.max(answer.length, guess.length);
  const colors: TileColor[] = new Array(len).fill("gray");
  const remaining = new Map<string, number>();

  for (let i = 0; i < len; i++) {
    const a = answer[i];
    const g = guess[i];
    if (g && a && g === a) {
      colors[i] = "green";
    } else if (a) {
      remaining.set(a, (remaining.get(a) ?? 0) + 1);
    }
  }

  for (let i = 0; i < len; i++) {
    if (colors[i] === "green") continue;
    const g = guess[i];
    if (!g) continue;
    const count = remaining.get(g) ?? 0;
    if (count > 0) {
      colors[i] = "yellow";
      remaining.set(g, count - 1);
    } else {
      colors[i] = "gray";
    }
  }

  const correct = answerNorm.length > 0 && answerNorm === guessNorm;
  return { colors, correct };
}

export function titleShapeFromRaw(raw: string): string {
  const norm = normalizeTeluguTitle(raw);
  const parts = norm.split(" ").filter(Boolean);
  return parts.map(p => "■".repeat(Array.from(p).length)).join(" ");
}

