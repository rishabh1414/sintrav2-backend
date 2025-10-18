import OpenAI from "openai";
import { EmployeeDoc } from "../models/Employee";
import { markdownToText } from "../utils/markdownToText";

const client = new OpenAI();

export async function askAgent(
  agent: EmployeeDoc,
  userText: string
): Promise<string> {
  const systemPrompt =
    agent.systemPrompt ||
    `You are ${agent.name}, ${agent.role}. Answer clearly and professionally.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    max_tokens: 700,
    temperature: 0.7,
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  return markdownToText(raw);
}
