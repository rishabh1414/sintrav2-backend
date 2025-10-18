import OpenAI from "openai";
import { Employee } from "../models/Employee";

/** What we need from the Employee doc (works with .lean() or full doc) */
type AnyEmployee = {
  _id: unknown;
  workspaceId?: string;
  name: string;
  role?: string;
  capabilities?: string[];
  systemPrompt?: string;
};

/** askED input/output */
type AskArgs = {
  workspaceId: string;
  chatEmployeeId: string; // the agent you’re currently chatting with (string id)
  userText: string;
};

type AskOut = {
  message: string;
  routedToId?: string;
  routedToName?: string;
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/* ----------------------- Small ID utility helpers ----------------------- */

function toId(x: unknown): string {
  // Robustly convert mongoose ObjectId / string / other to a string id
  if (x == null) return "";
  // If it looks like an object with toString, use that
  try {
    const s = (x as any).toString?.();
    if (typeof s === "string") return s;
  } catch {}
  // Fallback
  return String(x);
}

function sameId(a: unknown, b: unknown): boolean {
  return toId(a) === toId(b);
}

/* -------------------------- Simple routing logic ------------------------ */

function scoreAgent(
  e: AnyEmployee,
  lc: string,
  biasForCurrent: boolean
): number {
  let score = 0;

  // Capabilities boost
  for (const cap of e.capabilities || []) {
    const token = String(cap).toLowerCase().replace(/[_-]/g, " ");
    if (lc.includes(token)) score += 3;
  }

  // Keyword boosts (tweak as needed)
  if (/(social|instagram|facebook|tiktok|tweet|reels|post)/.test(lc))
    score += 5;
  if (/(blog|article|write|copy|content)/.test(lc)) score += 4;
  if (/(video|script|yt|youtube|reel)/.test(lc)) score += 4;
  if (/(design|ui|ux|landing|figma)/.test(lc)) score += 3;
  if (/(ads?|campaign|meta ads|google ads)/.test(lc)) score += 3;
  if (/(automation|zapier|make\.com|workflow|api|webhook)/.test(lc)) score += 3;

  if (biasForCurrent) score += 2; // light stickiness to current chat agent
  return score;
}

function pickBestAgent(
  all: AnyEmployee[],
  userText: string,
  currentId: string
): AnyEmployee | null {
  const lc = userText.toLowerCase();

  const scored = all
    .map((e) => {
      const bias = sameId(e._id, currentId);
      return { e, score: scoreAgent(e, lc, bias) };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0]?.e ?? null;

  // If best == current but the runner-up is clearly better (+3), switch
  if (best && sameId(best._id, currentId)) {
    const alt = scored[1];
    if (alt && alt.score >= (scored[0]?.score ?? 0) + 3) {
      return alt.e;
    }
  }

  return best;
}

/* ---------------------------- OpenAI wrapper ---------------------------- */

async function llmAnswer(
  systemPrompt: string,
  userText: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[ED] OPENAI_API_KEY missing – returning fallback.");
    return "I’m ready to help, but the language model isn’t configured (OPENAI_API_KEY missing).";
  }

  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content:
          (systemPrompt?.trim() ||
            "You are a helpful, concise business assistant.") +
          "\n\nRules:\n• Write like a professional human.\n• No markdown headings or **bold**.\n• Use short sections and bullets when helpful.\n• Keep it directly usable by the business owner.",
      },
      { role: "user", content: userText.trim() },
    ],
  });

  const text =
    resp.choices?.[0]?.message?.content?.trim() ||
    "I couldn’t generate a response right now.";
  return text;
}

/* -------------------------------- askED -------------------------------- */

export async function askED(args: AskArgs): Promise<AskOut> {
  const { workspaceId, chatEmployeeId, userText } = args;
  console.log("[ED] askED args:", { workspaceId, chatEmployeeId, userText });

  // Load all employees in workspace (lean is fine; we normalize _id)
  const employees = (await Employee.find({
    workspaceId,
  }).lean()) as unknown as AnyEmployee[];
  const current = employees.find((e) => sameId(e._id, chatEmployeeId)) || null;

  if (!current) {
    console.warn("[ED] Current chat employee not found by id:", chatEmployeeId);
  }

  const best = pickBestAgent(employees, userText, chatEmployeeId);

  console.log(
    "[ED] Routing decision:",
    "current=" +
      (current
        ? current.name + " (" + toId(current._id) + ")"
        : chatEmployeeId),
    "best=" + (best ? best.name + " (" + toId(best._id) + ")" : "(none)")
  );

  // Choose whose prompt to use (the routed target if different; else current; else best)
  const routedTarget =
    best && !sameId(best._id, chatEmployeeId) ? best : current || best || null;

  const systemPrompt =
    routedTarget?.systemPrompt ||
    "You are a helpful, concise business assistant.";

  // Small nudge for social requests
  const userNudge =
    /social|instagram|facebook|tiktok|tweet|reels/i.test(userText) &&
    "If appropriate, provide 5–8 short post ideas with captions and clear CTAs. Brand: “Clingy”.";
  const finalUser = userNudge ? `${userText}\n\n${userNudge}` : userText;

  const message = await llmAnswer(systemPrompt, finalUser);

  // If we actually routed to someone else, include their info for the UI
  if (routedTarget && !sameId(routedTarget._id, chatEmployeeId)) {
    return {
      message,
      routedToId: toId(routedTarget._id),
      routedToName: routedTarget.name,
    };
  }

  return { message };
}
