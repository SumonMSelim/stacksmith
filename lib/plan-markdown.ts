import type { Plan } from "./plan-types";

// Serialize a generated plan to markdown, used by "View as Markdown",
// "Copy for LLM", and the .md download.
export function planToMarkdown(idea: string, plan: Plan): string {
  const lines: string[] = [
    `# ${plan.app_name}`,
    "",
    `> ${idea.trim()}`,
    "",
    plan.summary,
    "",
    "## Recommended services",
    "",
    ...plan.services.map(
      (s) => `- \`${s.slug}\` (${s.category}, ${s.pricing}): ${s.reason}`,
    ),
    "",
    "## Setup commands",
    "",
    "```shell",
    ...plan.setup_commands,
    "```",
    "",
    "## Environment variables",
    "",
    ...Object.entries(plan.env_map).map(([k, v]) => `- \`${k}\`: ${v}`),
  ];
  if (plan.notes) {
    lines.push("", "## Notes", "", plan.notes);
  }
  return lines.join("\n") + "\n";
}

// "Copy for LLM": the markdown plan wrapped with instructions so it can be
// pasted straight into a coding agent as a build brief.
export function planToLlmPrompt(idea: string, plan: Plan): string {
  return [
    "Build the app described below. Provision its services with the Stripe Projects CLI",
    "using the exact setup commands listed, then implement the app. Credentials land in",
    ".env automatically after `stripe projects env --pull`; never hardcode them.",
    "",
    planToMarkdown(idea, plan).trimEnd(),
  ].join("\n");
}

// One paste-ready provisioning script.
export function planToSetupScript(plan: Plan): string {
  return ["#!/bin/sh", "set -e", "", ...plan.setup_commands].join("\n") + "\n";
}
