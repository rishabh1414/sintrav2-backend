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
  chatEmployeeId: string;
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
  if (x == null) return "";
  try {
    const s = (x as any).toString?.();
    if (typeof s === "string") return s;
  } catch {}
  return String(x);
}

function sameId(a: unknown, b: unknown): boolean {
  return toId(a) === toId(b);
}

/* -------------------------- Simple Fallback Routing ------------------------ */

function simpleFallbackRouting(
  employees: AnyEmployee[],
  userRequest: string,
  currentEmployeeId: string
): AnyEmployee {
  const lc = userRequest.toLowerCase();

  // Simple keyword-based matching as fallback
  const matches = employees.map((e) => {
    let score = 0;
    const roleAndCaps = `${e.role || ""} ${(e.capabilities || []).join(
      " "
    )}`.toLowerCase();

    // Social media
    if (
      /instagram|facebook|tiktok|social|tweet|post/i.test(lc) &&
      /social media/i.test(roleAndCaps)
    ) {
      score += 50;
    }

    // Content/Blog
    if (
      /blog|article|content|write/i.test(lc) &&
      /content strategist|seo/i.test(roleAndCaps)
    ) {
      score += 50;
    }

    // Email
    if (/email|newsletter/i.test(lc) && /email marketing/i.test(roleAndCaps)) {
      score += 50;
    }

    // Video
    if (/video|youtube|script/i.test(lc) && /video/i.test(roleAndCaps)) {
      score += 50;
    }

    // Design
    if (
      /design|wireframe|prototype|ui|ux/i.test(lc) &&
      /designer/i.test(roleAndCaps)
    ) {
      score += 50;
    }

    // Data/Research
    if (
      /data|analytics|research|report/i.test(lc) &&
      /data analyst|research/i.test(roleAndCaps)
    ) {
      score += 50;
    }

    // Automation
    if (
      /automate|zapier|workflow|integration/i.test(lc) &&
      /automation/i.test(roleAndCaps)
    ) {
      score += 50;
    }

    // Sales
    if (/sales|pitch|deal|lead/i.test(lc) && /sales/i.test(roleAndCaps)) {
      score += 50;
    }

    // Customer Success
    if (
      /customer|support|help|onboard/i.test(lc) &&
      /customer success/i.test(roleAndCaps)
    ) {
      score += 50;
    }

    // Current employee slight bonus
    if (sameId(e._id, currentEmployeeId)) {
      score += 2;
    }

    return { employee: e, score };
  });

  // Sort by score and return best
  matches.sort((a, b) => b.score - a.score);

  const best = matches[0];
  console.log(
    "[ED] Fallback routing selected:",
    best.employee.name,
    "with score:",
    best.score
  );

  return best.employee;
}

/* -------------------------- AI-Powered Routing -------------------------- */

type RoutingDecision = {
  bestEmployeeId: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
};

async function aiSelectBestEmployee(
  employees: AnyEmployee[],
  userRequest: string,
  currentEmployeeId: string
): Promise<RoutingDecision | null> {
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[ED] OPENAI_API_KEY not configured, skipping AI routing");
    return null;
  }

  // Build a concise employee summary for the AI
  const employeeSummary = employees.map((e, idx) => {
    const id = toId(e._id);
    const isCurrent = sameId(e._id, currentEmployeeId);
    return {
      index: idx,
      id,
      name: e.name,
      role: e.role || "General Assistant",
      capabilities: (e.capabilities || []).slice(0, 5), // limit to top 5 for token efficiency
      isCurrent,
    };
  });

  const systemPrompt = `You are an intelligent task routing system for a business workspace. Your job is to analyze a user's request and determine which employee (AI agent) is BEST suited to handle it.

RULES:
1. Match the request to the employee whose role and capabilities are MOST aligned
2. Consider the nature of the task (creative, analytical, technical, strategic, etc.)
3. Prefer specialists over generalists when there's a clear specialty match
4. Only stick with the current employee if they're truly the best match (not just for continuity)
5. Be decisive - always pick the single best match

You must respond in JSON format:
{
  "bestEmployeeId": "employee_id_here",
  "reasoning": "Brief 1-2 sentence explanation of why this employee is best",
  "confidence": "high" | "medium" | "low"
}`;

  const userPrompt = `EMPLOYEES:
${JSON.stringify(employeeSummary, null, 2)}

CURRENT EMPLOYEE: ${employeeSummary.find((e) => e.isCurrent)?.name || "None"}

USER REQUEST: "${userRequest}"

Which employee should handle this request? Respond with JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3, // Lower temperature for more consistent routing
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const decision = JSON.parse(content) as RoutingDecision;

    // Validate the response
    if (
      !decision.bestEmployeeId ||
      !employees.find((e) => toId(e._id) === decision.bestEmployeeId)
    ) {
      throw new Error("Invalid employee ID in AI response");
    }

    console.log("[ED] AI Routing Decision:", {
      selected: employees.find((e) => toId(e._id) === decision.bestEmployeeId)
        ?.name,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    });

    return decision;
  } catch (error: any) {
    console.error("[ED] AI routing failed:", {
      error: error?.message || error,
      stack: error?.stack,
    });

    // Return null to trigger fallback routing
    return null;
  }
}

/* ---------------------------- OpenAI wrapper ---------------------------- */

async function llmAnswer(
  systemPrompt: string,
  userText: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[ED] OPENAI_API_KEY missing – returning fallback.");
    return "I'm ready to help, but the language model isn't configured (OPENAI_API_KEY missing).";
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
    "I couldn't generate a response right now.";
  return text;
}

/* -------------------------------- askED -------------------------------- */

export async function askED(args: AskArgs): Promise<AskOut> {
  const { workspaceId, chatEmployeeId, userText } = args;
  console.log("[ED] askED called:", {
    workspaceId,
    chatEmployeeId,
    userTextPreview: userText.substring(0, 100),
  });

  // Load all employees in workspace
  const employees = (await Employee.find({
    workspaceId,
  }).lean()) as unknown as AnyEmployee[];

  console.log(`[ED] Found ${employees.length} employees in workspace`);

  if (employees.length === 0) {
    console.warn("[ED] No employees found in workspace");
    const message = await llmAnswer(
      "You are a helpful, concise business assistant.",
      userText
    );
    return { message };
  }

  const current = employees.find((e) => sameId(e._id, chatEmployeeId)) || null;

  if (!current) {
    console.warn("[ED] Current chat employee not found by id:", chatEmployeeId);
  }

  // Use AI to select the best employee (with fallback)
  let best: AnyEmployee | null = null;
  let routingMethod = "AI";

  const aiDecision = await aiSelectBestEmployee(
    employees,
    userText,
    chatEmployeeId
  );

  if (aiDecision) {
    // AI routing succeeded
    best =
      employees.find((e) => toId(e._id) === aiDecision.bestEmployeeId) || null;
  }

  if (!best) {
    // AI routing failed or returned invalid result, use simple fallback
    console.log("[ED] Using fallback routing (AI routing unavailable)");
    best = simpleFallbackRouting(employees, userText, chatEmployeeId);
    routingMethod = "Fallback";
  }

  if (!best) {
    console.error(
      "[ED] Both AI and fallback routing failed, using current or first employee"
    );
    best = current || employees[0];
    routingMethod = "Default";
  }

  console.log(
    "[ED] Final routing decision:",
    "method=" + routingMethod,
    "current=" +
      (current ? `${current.name} (${toId(current._id)})` : chatEmployeeId),
    "→ routed to=" + `${best.name} (${toId(best._id)})`
  );

  // Use the routed agent's system prompt
  const systemPrompt =
    best.systemPrompt || "You are a helpful, concise business assistant.";

  // Add context about the routing if needed
  const finalUserText = userText;

  const message = await llmAnswer(systemPrompt, finalUserText);

  // Return routing info if we switched agents
  if (!sameId(best._id, chatEmployeeId)) {
    return {
      message,
      routedToId: toId(best._id),
      routedToName: best.name,
    };
  }

  return { message };
}
