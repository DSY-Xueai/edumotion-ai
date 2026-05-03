type JsonSchema = Record<string, unknown>;

const readErrorMessage = async (response: Response) => {
  const body = await response.text();

  return body || response.statusText;
};

const readMessageContent = (message: Record<string, unknown>) => {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    const textParts = message.content
      .map((item) => {
        if (!item || typeof item !== "object") {
          return "";
        }

        if (item.type === "text" && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .filter(Boolean);

    if (textParts.length > 0) {
      return textParts.join("\n");
    }
  }

  if (typeof message.refusal === "string" && message.refusal.length > 0) {
    throw new Error(`OpenAI refused structured output request: ${message.refusal}`);
  }

  throw new Error("OpenAI returned no structured content.");
};

export const requestStructuredOpenAIOutput = async <T>({
  apiKey,
  baseUrl,
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  schemaName: string;
  schema: JsonSchema;
  systemPrompt: string;
  userPrompt: string;
}): Promise<T> => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI structured output failed: ${response.status} ${await readErrorMessage(
        response,
      )}`,
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];

  if (!firstChoice || typeof firstChoice !== "object") {
    throw new Error("OpenAI returned no completion choices.");
  }

  const message =
    "message" in firstChoice && firstChoice.message && typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : null;

  if (!message) {
    throw new Error("OpenAI completion response is missing a message payload.");
  }

  return JSON.parse(readMessageContent(message)) as T;
};
