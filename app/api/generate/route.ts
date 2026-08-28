import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_CATALOG } from "@/lib/catalog";
import { extractJson } from "@/lib/extract-json";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Stacksmith, an expert cloud architect for the Stripe Projects CLI.

The user describes an app in one sentence. You design its service stack using ONLY providers from this catalog (format: category: provider/service slugs):

${PROVIDER_CATALOG}

Rules:
- Recommend the smallest stack that fully covers the idea. Prefer free tiers.
- Use exact "provider/service" slugs from the catalog. Never invent providers.
- Some services require a plan resource before the project resource. Known cases:
  vercel/project needs "stripe projects add vercel/hobby" first;
  supabase/project needs "stripe projects add supabase/free" first.
  Include those plan commands in setup_commands in the correct order.
- Every setup_commands entry must be a real shell command, starting with
  "stripe projects init <app-name>" and using
  "stripe projects add <provider>/<service> --accept-tos --yes" for each service,
  ending with "stripe projects env --pull".
- env_map keys are the environment variables the chosen providers actually emit
  (e.g. OPENROUTER_API_KEY, SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_DB_URL, VERCEL_TOKEN, VERCEL_PROJECT_ID), values are one-line
  descriptions of what the app uses them for.

Respond with ONLY a JSON object, no markdown fences, matching:
{
  "app_name": "kebab-case-name",
  "summary": "one sentence restating what will be built",
  "services": [
    { "slug": "provider/service", "category": "hosting|database|auth|ai|...",
      "reason": "why this service, one sentence", "pricing": "Free|Paid|Free & Paid" }
  ],
  "setup_commands": ["stripe projects init ...", "..."],
  "env_map": { "ENV_VAR": "what it's for" },
  "notes": "optional caveats or next steps, one or two sentences"
}`;

export async function POST(req: NextRequest) {
  const { idea, refine } = await req.json();
  if (typeof idea !== "string" || idea.trim().length < 10) {
    return NextResponse.json(
      { error: "Describe your app in at least one sentence." },
      { status: 400 },
    );
  }

  // Optional refinement: prior plan + an instruction like "make it cheaper".
  const refining =
    refine &&
    typeof refine.instruction === "string" &&
    refine.instruction.trim().length > 0 &&
    typeof refine.plan === "object" &&
    refine.plan !== null;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured." },
      { status: 500 },
    );
  }

  // Free-tier model pools get rate-limited upstream; fall through a chain
  // until one answers with parseable JSON.
  const candidates = [
    ...(process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : []),
    "nvidia/nemotron-3-super-120b-a12b:free",
    "minimax/minimax-m3:free",
    "z-ai/glm-5.2:free",
    "google/gemma-4-31b-it:free",
  ];

  let lastError = "";
  for (const model of candidates) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.VERCEL_PROJECT_URL ?? "http://localhost:3000",
        "X-Title": "Stacksmith",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: idea.trim().slice(0, 500) },
          ...(refining
            ? [
                { role: "assistant" as const, content: JSON.stringify(refine.plan) },
                {
                  role: "user" as const,
                  content: `Refine the plan: ${refine.instruction.trim().slice(0, 300)}. Respond with ONLY the full updated JSON object in the same schema.`,
                },
              ]
            : []),
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      lastError = `Model call failed (${res.status})`;
      console.error("OpenRouter error", model, res.status, (await res.text()).slice(0, 300));
      continue;
    }

    const completion = await res.json();
    const raw = completion.choices?.[0]?.message?.content ?? "";
    try {
      const plan = extractJson(raw);
      return NextResponse.json({ plan, model: completion.model ?? model });
    } catch {
      lastError = "The model returned an unparseable plan";
      console.error("Unparseable model output", model, raw.slice(0, 300));
    }
  }

  return NextResponse.json(
    { error: `${lastError}. All free models are busy — try again shortly.` },
    { status: 502 },
  );
}
