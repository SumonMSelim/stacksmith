"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Plan } from "@/lib/plan-types";
import { planToLlmPrompt, planToMarkdown, planToSetupScript } from "@/lib/plan-markdown";
import { decodeSharedPlan, encodeSharedPlan } from "@/lib/plan-share";

type HistoryRow = {
  id: string;
  idea: string;
  plan: Plan;
  created_at: string;
};

const EXAMPLE_IDEAS = [
  "A private feedback app with login, search, and AI summaries",
  "A recipe box that turns photos of handwritten recipes into searchable cards",
  "A waitlist page with referral tracking and an email drip",
  "A voice journal that transcribes entries and finds recurring themes",
];

const REFINE_OPTIONS = ["Make it cheaper", "Add auth", "Add payments", "Simplify"];

export default function Stacksmith({
  supabaseUrl,
  supabaseKey,
}: {
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const supabase: SupabaseClient | null = useMemo(
    () =>
      supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey, {
            auth: { detectSessionInUrl: true, persistSession: true },
          })
        : null,
    [supabaseUrl, supabaseKey],
  );

  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [refiningWith, setRefiningWith] = useState("");
  const [error, setError] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [authStep, setAuthStep] = useState<"idle" | "email" | "sent">("idle");
  const [authMsg, setAuthMsg] = useState("");

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const lastIdea = useRef("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load a shared plan from the URL fragment (#p=...).
  useEffect(() => {
    const match = window.location.hash.match(/^#p=([A-Za-z0-9_-]+)/);
    if (!match) return;
    try {
      const shared = decodeSharedPlan(match[1]);
      setIdea(shared.idea);
      setPlan(shared.plan);
      lastIdea.current = shared.idea;
    } catch {
      setError("That shared plan link is invalid or truncated.");
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      setHistory([]);
      return;
    }
    supabase
      .from("stacks")
      .select("id, idea, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data as HistoryRow[]) ?? []));
  }, [supabase, user]);

  async function callGenerate(body: Record<string, unknown>) {
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setPlan(data.plan);
      setModel(data.model ?? "");
      setSaved(false);
      setViewingId(null);
      setShowMarkdown(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function generate() {
    setLoading(true);
    setPlan(null);
    lastIdea.current = idea;
    await callGenerate({ idea });
    setLoading(false);
  }

  async function refine(instruction: string) {
    if (!plan) return;
    setRefiningWith(instruction);
    await callGenerate({
      idea: lastIdea.current,
      refine: { plan, instruction },
    });
    setRefiningWith("");
  }

  function newStack() {
    setIdea("");
    setPlan(null);
    setModel("");
    setError("");
    setViewingId(null);
    setSaved(false);
    setShowMarkdown(false);
    lastIdea.current = "";
    if (window.location.hash.startsWith("#p=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  async function saveStack() {
    if (!supabase || !user || !plan || saved) return;
    const { data, error: err } = await supabase
      .from("stacks")
      .insert({ user_id: user.id, idea: lastIdea.current, plan })
      .select("id, idea, plan, created_at")
      .single();
    if (err) {
      setError(`Save failed: ${err.message}`);
      return;
    }
    setHistory((h) => [data as HistoryRow, ...h]);
    setSaved(true);
    setViewingId((data as HistoryRow).id);
  }

  async function deleteStack(id: string) {
    if (!supabase) return;
    const { error: err } = await supabase.from("stacks").delete().eq("id", id);
    if (err) {
      setError(`Delete failed: ${err.message}`);
      return;
    }
    setHistory((h) => h.filter((row) => row.id !== id));
    if (viewingId === id) newStack();
  }

  async function sendMagicLink() {
    if (!supabase) return;
    setAuthMsg("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });
    if (err) setAuthMsg(err.message);
    else {
      setAuthStep("sent");
      setAuthMsg("Check your email and click the login link.");
    }
  }

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedKey(""), 1600);
  }

  function copyShareLink() {
    if (!plan) return;
    const encoded = encodeSharedPlan({ idea: lastIdea.current, plan });
    copy("share", `${window.location.origin}/#p=${encoded}`);
  }

  const busy = loading || refiningWith !== "";

  return (
    <main className="wrap">
      <header className="top">
        <h1>
          <a className="logolink" href="/">
            Stacksmith <span className="hammer">🔨</span>
          </a>
        </h1>
        <div className="auth">
          {user ? (
            <>
              <span className="who">{user.email}</span>
              <button className="ghost" onClick={() => supabase?.auth.signOut()}>
                Sign out
              </button>
            </>
          ) : authStep === "idle" ? (
            <button className="ghost" onClick={() => setAuthStep("email")}>
              Log in to save history
            </button>
          ) : authStep === "email" ? (
            <span className="authrow">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button onClick={sendMagicLink} disabled={!email.includes("@")}>
                Send login link
              </button>
            </span>
          ) : (
            <button className="ghost" onClick={() => setAuthStep("email")}>
              Resend link
            </button>
          )}
        </div>
      </header>
      {authMsg && <p className="authmsg">{authMsg}</p>}

      <p className="tag">
        Describe your app in one sentence, get a provisioned architecture plan for the{" "}
        <a href="https://projects.dev" target="_blank" rel="noreferrer">
          Stripe Projects CLI
        </a>
        .
      </p>

      <div className="forge">
        <textarea
          rows={3}
          placeholder='e.g. "I need a private feedback app with login, search, and AI summaries"'
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
          }}
          disabled={!!viewingId}
        />
        {!plan && !loading && (
          <div className="examples">
            {EXAMPLE_IDEAS.map((ex) => (
              <button key={ex} className="chip" onClick={() => setIdea(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
        <span className="forgerow">
          <button
            className="primary"
            onClick={generate}
            disabled={busy || !!viewingId || idea.trim().length < 10}
          >
            {loading ? "Forging…" : "Forge my stack"}
          </button>
          {(plan || viewingId) && (
            <button className="ghost" onClick={newStack}>
              ← Back to new
            </button>
          )}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {plan && (
        <section className="result">
          <div className="resulthead">
            <h2>{plan.app_name}</h2>
            <span className="resultactions">
              {user && !viewingId && (
                <button className="ghost" onClick={saveStack} disabled={saved}>
                  {saved ? "Saved" : "Save to history"}
                </button>
              )}
              {viewingId && (
                <button className="ghost" onClick={newStack}>
                  New stack
                </button>
              )}
            </span>
          </div>
          <p className="summary">{plan.summary}</p>

          <div className="exportbar">
            <button className="ghost" onClick={copyShareLink}>
              {copiedKey === "share" ? "Link copied" : "Copy share link"}
            </button>
            <button className="ghost" onClick={() => copy("script", planToSetupScript(plan))}>
              {copiedKey === "script" ? "Copied" : "Copy setup script"}
            </button>
            <button
              className="ghost"
              onClick={() => copy("llm", planToLlmPrompt(lastIdea.current, plan))}
            >
              {copiedKey === "llm" ? "Copied" : "Copy for LLM"}
            </button>
            <button className="ghost" onClick={() => setShowMarkdown((v) => !v)}>
              {showMarkdown ? "View formatted" : "View as Markdown"}
            </button>
          </div>

          {showMarkdown ? (
            <pre className="mdview">
              <code>{planToMarkdown(lastIdea.current, plan)}</code>
            </pre>
          ) : (
            <>
              <h3>Recommended services</h3>
              <ul className="services">
                {plan.services.map((s) => (
                  <li key={s.slug}>
                    <code>{s.slug}</code>
                    <span
                      className={`badge ${s.pricing.toLowerCase().includes("free") ? "free" : "paid"}`}
                    >
                      {s.pricing}
                    </span>
                    <p>{s.reason}</p>
                  </li>
                ))}
              </ul>

              <h3>Setup commands</h3>
              <pre className="commands">
                <code>{plan.setup_commands.join("\n")}</code>
              </pre>
              <button
                className="ghost"
                onClick={() => copy("commands", plan.setup_commands.join("\n"))}
              >
                {copiedKey === "commands" ? "Copied" : "Copy commands"}
              </button>

              <h3>Starter .env map</h3>
              <ul className="envmap">
                {Object.entries(plan.env_map).map(([k, v]) => (
                  <li key={k}>
                    <code>{k}</code>: {v}
                  </li>
                ))}
              </ul>

              {plan.notes && <p className="notes">{plan.notes}</p>}
              {model && <p className="model">model: {model}</p>}
            </>
          )}

          {!viewingId && (
            <div className="refinebar">
              <span className="refinelabel">Refine:</span>
              {REFINE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className="chip"
                  onClick={() => refine(opt)}
                  disabled={busy}
                >
                  {refiningWith === opt ? "Reforging…" : opt}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {user && history.length > 0 && (
        <section className="history">
          <h3>Your history</h3>
          <ul>
            {history.map((h) => (
              <li key={h.id} className={h.id === viewingId ? "active" : ""}>
                <button
                  className="linklike"
                  onClick={() => {
                    setIdea(h.idea);
                    setPlan(h.plan);
                    setModel("");
                    setViewingId(h.id);
                    setSaved(true);
                    setShowMarkdown(false);
                    lastIdea.current = h.idea;
                  }}
                >
                  {h.idea.length > 80 ? h.idea.slice(0, 80) + "…" : h.idea}
                </button>
                <span className="when">{new Date(h.created_at).toLocaleDateString()}</span>
                <button className="iconbtn" title="Delete" onClick={() => deleteStack(h.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer>
        Built with the Stripe Projects CLI · OpenRouter · Supabase · Vercel,{" "}
        <a
          href="https://github.com/sumonmselim/stacksmith"
          target="_blank"
          rel="noreferrer"
        >
          by SumonMSelim
        </a>{" "}
        · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
      </footer>
    </main>
  );
}
