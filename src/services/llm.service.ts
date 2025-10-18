import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callLLM(prompt: string, message: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: message },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return res.choices[0]?.message?.content?.trim() ?? "";
}
