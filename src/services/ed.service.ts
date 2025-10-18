import OpenAI from "openai";
import { MessageModel } from "../models/Message";
import { Employee } from "../models/Employee";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Executive Director Agent
 * Receives text + employeeId and routes/responds accordingly
 */
export async function askED(employeeId: string, text: string): Promise<string> {
  // 🧭 Find employee
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  // 💾 Save user message
  await MessageModel.create({
    employeeId,
    sender: "user",
    text,
    ts: Date.now(),
  });

  // 🧠 Build prompt context
  const systemPrompt = `You are the Executive Director agent.
The message is assigned to ${employee.name} (${employee.role}).
If the message doesn't match their responsibilities, assign to another suitable employee logically.
Otherwise, respond as ${employee.name}. Keep answers clean and concise.`;

  // 🤖 Ask OpenAI
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
  });

  const reply = result.choices[0]?.message?.content?.trim() ?? "(No response)";

  // 💾 Save bot response
  await MessageModel.create({
    employeeId,
    sender: "agent",
    text: reply,
    ts: Date.now(),
  });

  return reply;
}
