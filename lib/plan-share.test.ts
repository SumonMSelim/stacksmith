import { describe, expect, it } from "vitest";
import { decodeSharedPlan, encodeSharedPlan } from "./plan-share";
import type { Plan } from "./plan-types";

const plan: Plan = {
  app_name: "café-notes",
  summary: "Notes app with émojis 🚀 and unicode.",
  services: [{ slug: "neon/postgres", category: "database", reason: "Serverless Postgres.", pricing: "Free" }],
  setup_commands: ["stripe projects init cafe-notes"],
  env_map: { DATABASE_URL: "Postgres connection string" },
};

describe("plan share encoding", () => {
  it("round-trips unicode content", () => {
    const encoded = encodeSharedPlan({ idea: "notes for a café ☕", plan });
    const decoded = decodeSharedPlan(encoded);
    expect(decoded.idea).toBe("notes for a café ☕");
    expect(decoded.plan).toEqual(plan);
  });

  it("emits URL-fragment-safe output", () => {
    const encoded = encodeSharedPlan({ idea: "x".repeat(300), plan });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects payloads that are not plans", () => {
    const bogus = btoa(JSON.stringify({ hello: "world" }));
    expect(() => decodeSharedPlan(bogus)).toThrow();
    expect(() => decodeSharedPlan("not-base64!!!")).toThrow();
  });
});
