// src/services/powerup.service.ts
import OpenAI from "openai";
import { z } from "zod";
import { env } from "../config/env";
import { nanoid } from "nanoid";
import { PowerupCatalogService } from "./powerupCatalog.service";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Public run contract for callers.
 * - We still use Zod here just to validate the *caller's* payload.
 * - Actual power-up input/output validation uses AJV against the DB JSON Schemas.
 */
export const PowerupRunInput = z.object({
  workspaceId: z.string().min(1),
  powerupKey: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()).default({}),
  helperKey: z.string().optional(),
  model: z.string().default(""), // allow empty; we'll fallback to catalog default
});
export type PowerupRunInputType = z.infer<typeof PowerupRunInput>;

export class PowerupService {
  /**
   * Resolve catalog → validate input (AJV) → call OpenAI → validate output (AJV)
   */
  static async run(input: PowerupRunInputType) {
    const parsed = PowerupRunInput.parse(input);
    const { workspaceId, powerupKey, helperKey } = parsed;

    // 1) Load effective catalog definition (workspace override > global)
    const pu = await PowerupCatalogService.getByKey(powerupKey, workspaceId);
    if (!pu || !pu.enabled) {
      const e: any = new Error("Power-up not found or disabled");
      e.statusCode = 404;
      throw e;
    }

    // 2) Compile validators from JSON Schemas (if present)
    const { validateInput, validateOutput } =
      PowerupCatalogService.compileValidators(pu);

    // 3) Validate inputs with AJV if schema is provided
    let userInputs: Record<string, unknown> = parsed.inputs || {};
    if (validateInput) {
      const ok = validateInput(userInputs);
      if (!ok) {
        const e: any = new Error("Input validation failed");
        e.statusCode = 400;
        e.details = validateInput.errors;
        throw e;
      }
      // AJV can coerce/strip based on schema options; use the (possibly) mutated `userInputs`.
      userInputs = userInputs as Record<string, unknown>;
    }

    // 4) Build instruction messages
    const modelToUse = parsed.model || pu.modelDefault || "gpt-4o-mini";

    // Provide a minimal JSON schema hint (if you stored one); this is advisory for the model
    // The API won't enforce it — we enforce with AJV after parsing.
    const outputSchemaHint = pu.outputSchema
      ? JSON.stringify(pu.outputSchema)
      : JSON.stringify({
          type: "object",
          description: "Return a JSON object.",
        });

    const sys = [
      pu.systemPrompt ||
        "You are a capable assistant. Return strict JSON only.",
      "You MUST output valid JSON only, matching the described fields. Do NOT include markdown fences.",
    ].join("\n");

    const userMsg = [
      `POWERUP_KEY: ${powerupKey}`,
      `HELPER_KEY: ${helperKey ?? "n/a"}`,
      `WORKSPACE_ID: ${workspaceId}`,
      `INPUTS: ${JSON.stringify(userInputs)}`,
      `OUTPUT_SCHEMA_HINT: ${outputSchemaHint}`,
      `Return ONLY the JSON result.`,
    ].join("\n");

    // 5) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      temperature: 0.7,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ],
      // If your tier supports strict JSON, you can enforce:
      // response_format: { type: "json_object" } as any
    });

    // 6) Parse JSON (with fence salvage)
    const raw = completion.choices[0]?.message?.content?.trim() || "";
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      const salvaged = raw.replace(/^```json|```$/g, "").trim();
      json = JSON.parse(salvaged);
    }

    // 7) Validate output with AJV if schema provided
    if (validateOutput) {
      const ok = validateOutput(json);
      if (!ok) {
        const e: any = new Error("Output validation failed");
        e.statusCode = 502; // bad upstream output
        e.details = validateOutput.errors;
        // Attach the raw model output for debugging (omit in prod logs if sensitive)
        e.modelOutput = json;
        throw e;
      }
    }

    // 8) Return a run record (you can persist this later)
    const runId = `run_${nanoid(10)}`;
    return {
      runId,
      powerupKey,
      model: modelToUse,
      inputs: userInputs,
      output: json,
      meta: {
        tokens_used: completion.usage?.total_tokens ?? null,
        created: new Date().toISOString(),
      },
    };
  }
}
