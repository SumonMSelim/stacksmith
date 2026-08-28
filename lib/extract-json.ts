// LLMs sometimes wrap JSON in markdown fences or prose despite instructions.
// Pull the first balanced top-level JSON object out of the raw completion text.
export function extractJson<T = unknown>(raw: string): T {
  const text = raw.trim();
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model output");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error("Unbalanced JSON object in model output");
}
