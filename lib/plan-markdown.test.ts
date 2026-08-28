import { describe, expect, it } from "vitest";
import { planToLlmPrompt, planToMarkdown, planToSetupScript } from "./plan-markdown";
import type { Plan } from "./plan-types";

const plan: Plan = {
  app_name: "feedback-box",
  summary: "A private feedback app with login and AI summaries.",
  services: [
    { slug: "supabase/project", category: "database", reason: "Postgres plus auth.", pricing: "Free" },
    { slug: "openrouter/api", category: "ai", reason: "Summaries via one API.", pricing: "Free & Paid" },
  ],
  setup_commands: [
    "stripe projects init feedback-box",
    "stripe projects add supabase/free --accept-tos --yes",
    "stripe projects add supabase/project --accept-tos --yes",
    "stripe projects env --pull",
  ],
  env_map: { SUPABASE_PROJECT_URL: "Supabase API endpoint" },
  notes: "Enable RLS on user tables.",
};

describe("planToMarkdown", () => {
  it("renders every section with the idea as a blockquote", () => {
    const md = planToMarkdown("I need a feedback app", plan);
    expect(md).toContain("# feedback-box");
    expect(md).toContain("> I need a feedback app");
    expect(md).toContain("- `supabase/project` (database, Free): Postgres plus auth.");
    expect(md).toContain("```shell\nstripe projects init feedback-box");
    expect(md).toContain("- `SUPABASE_PROJECT_URL`: Supabase API endpoint");
    expect(md).toContain("## Notes\n\nEnable RLS on user tables.");
  });

  it("omits the notes section when absent", () => {
    const md = planToMarkdown("idea", { ...plan, notes: undefined });
    expect(md).not.toContain("## Notes");
  });
});

describe("planToLlmPrompt", () => {
  it("prefixes build instructions before the markdown plan", () => {
    const prompt = planToLlmPrompt("I need a feedback app", plan);
    expect(prompt.startsWith("Build the app described below.")).toBe(true);
    expect(prompt).toContain("# feedback-box");
  });
});

describe("planToSetupScript", () => {
  it("produces a shell script with all commands", () => {
    const script = planToSetupScript(plan);
    expect(script.startsWith("#!/bin/sh\nset -e\n")).toBe(true);
    expect(script).toContain("stripe projects env --pull\n");
  });
});
