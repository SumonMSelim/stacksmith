import type { Plan } from "./plan-types";

export type SharedPlan = { idea: string; plan: Plan };

// Unicode-safe base64url encoding of { idea, plan }, small enough to live in
// a URL fragment (plans are a few KB). Fragment prefix used by the app: #p=
export function encodeSharedPlan(shared: SharedPlan): string {
  const bytes = new TextEncoder().encode(JSON.stringify(shared));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSharedPlan(encoded: string): SharedPlan {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (
    typeof parsed?.idea !== "string" ||
    typeof parsed?.plan?.app_name !== "string" ||
    !Array.isArray(parsed?.plan?.services) ||
    !Array.isArray(parsed?.plan?.setup_commands)
  ) {
    throw new Error("Not a valid shared plan");
  }
  return parsed as SharedPlan;
}
