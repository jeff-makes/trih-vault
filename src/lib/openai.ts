import axios, { AxiosError } from "axios";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatCompletionParams {
  messages: ChatMessage[];
  temperature?: number;
}

export interface ChatCompletionResult {
  model: string;
  content: string;
}

export interface OpenAiClientOptions {
  apiKey?: string;
  primaryModel?: string;
  fallbackModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface OpenAiClient {
  chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toResponseInput = (messages: ChatMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: [{ type: "input_text", text: message.content }]
  }));

const extractResponseText = (data: any): string => {
  if (!data) {
    return "";
  }

  if (typeof data.output_text === "string" && data.output_text.trim().length > 0) {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    for (const entry of data.output) {
      if (Array.isArray(entry?.content)) {
        for (const fragment of entry.content) {
          const text =
            typeof fragment?.text === "string"
              ? fragment.text
              : typeof fragment?.value === "string"
              ? fragment.value
              : typeof fragment?.content === "string"
              ? fragment.content
              : null;
          if (text && text.trim().length > 0) {
            return text.trim();
          }
          if (Array.isArray(fragment?.content)) {
            const nested = fragment.content
              .map((item: any) => item?.text ?? item?.value ?? item?.content ?? "")
              .find((value: string) => value && value.trim().length > 0);
            if (nested) {
              return nested.trim();
            }
          }
        }
      }
    }
  }

  return "";
};

const createModelCaller =
  (apiKey: string, model: string, timeoutMs: number, maxRetries: number) =>
  async (params: ChatCompletionParams): Promise<ChatCompletionResult> => {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxRetries) {
      try {
        const payload: Record<string, unknown> = {
          model,
          input: toResponseInput(params.messages)
        };

        if (typeof params.temperature === "number") {
          payload.temperature = params.temperature;
        }

        const response = await axios.post(
          "https://api.openai.com/v1/responses",
          payload,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            timeout: timeoutMs
          }
        );

        const content = extractResponseText(response.data);

        return {
          model: response.data?.model ?? model,
          content
        };
      } catch (error) {
        lastError = error;
        const axiosError = error as AxiosError;

        const status = axiosError.response?.status ?? 0;
        const isRetryable = status >= 500 || status === 429 || status === 408 || status === 0;

        attempt += 1;
        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        const backoffMs = Math.min(2 ** attempt * 1000, 10_000);
        await sleep(backoffMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Unknown OpenAI error");
  };

export const createOpenAiClient = (options: OpenAiClientOptions = {}): OpenAiClient => {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const primaryModel = options.primaryModel ?? process.env.OPENAI_MODEL_PRIMARY ?? "gpt-5-nano";
  const fallbackModel = options.fallbackModel ?? process.env.OPENAI_MODEL_FALLBACK ?? "gpt-4o-mini";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  const callPrimary = createModelCaller(apiKey, primaryModel, timeoutMs, maxRetries);
  const callFallback =
    fallbackModel && fallbackModel !== primaryModel
      ? createModelCaller(apiKey, fallbackModel, timeoutMs, maxRetries)
      : null;

  return {
    async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
      try {
        return await callPrimary(params);
      } catch (error) {
        if (!callFallback) {
          throw error;
        }

        return callFallback(params);
      }
    }
  };
};

export default createOpenAiClient;
