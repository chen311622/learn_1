import * as vscode from 'vscode';

export type Task = 'explain' | 'comment';

export interface LlmOptions {
  provider?: 'ollama' | 'openai';
  ollamaEndpoint?: string;
  ollamaModel?: string;
  openaiBaseUrl?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

function buildPrompt(code: string, task: Task, languageId: string): string {
  const body = `语言: ${languageId}\n\`\`\`\n${code}\n\`\`\``;
  if (task === 'explain') {
    return `你是一位资深工程师。请用中文解释下面这段代码的作用、关键逻辑和潜在问题，分点说明：\n${body}`;
  }
  return `请为下面的代码生成高质量的中文注释。要求：只添加注释，不改动原有的代码逻辑，直接返回带注释的完整代码：\n${body}`;
}

/**
 * 从传入的 options 或 VSCode 配置读取实际使用的参数。
 */
function resolveOptions(opts: LlmOptions) {
  const root = vscode.workspace.getConfiguration('codeExplainer');
  const ollama = vscode.workspace.getConfiguration('codeExplainer.ollama');
  const openai = vscode.workspace.getConfiguration('codeExplainer.openai');

  return {
    provider: opts.provider ?? root.get<'ollama' | 'openai'>('provider', 'ollama'),
    ollamaEndpoint: (opts.ollamaEndpoint ?? ollama.get<string>('endpoint', 'http://localhost:11434')).replace(/\/$/, ''),
    ollamaModel: opts.ollamaModel ?? ollama.get<string>('model', 'qwen2.5-coder:7b'),
    openaiBaseUrl: (opts.openaiBaseUrl ?? openai.get<string>('baseUrl', 'https://api.openai.com/v1')).replace(/\/$/, ''),
    openaiApiKey: opts.openaiApiKey ?? openai.get<string>('apiKey', ''),
    openaiModel: opts.openaiModel ?? openai.get<string>('model', 'gpt-4o-mini')
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`请求超时（超过 ${timeoutMs}ms 未响应）`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(prompt: string, endpoint: string, model: string): Promise<string> {
  const res = await fetchWithTimeout(
    `${endpoint}/api/chat`,
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }]
    })
    },
    120000
  );
  if (!res.ok) {
    throw new Error(`Ollama 请求失败 ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? '';
}

async function callPaidApi(prompt: string, baseUrl: string, apiKey: string, model: string): Promise<string> {
  if (!apiKey) {
    throw new Error('未配置 codeExplainer.openai.apiKey');
  }
  const res = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    },
    120000
  );
  if (!res.ok) {
    throw new Error(`API 请求失败 ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * 统一入口：根据 provider 决定调用本地 Ollama 还是付费 API。
 * task 为 'explain' 时解释代码，为 'comment' 时生成注释。
 */
export async function askLLM(
  code: string,
  task: Task,
  languageId: string,
  options: LlmOptions = {}
): Promise<string> {
  const prompt = buildPrompt(code, task, languageId);
  const o = resolveOptions(options);

  return o.provider === 'openai'
    ? callPaidApi(prompt, o.openaiBaseUrl, o.openaiApiKey, o.openaiModel)
    : callOllama(prompt, o.ollamaEndpoint, o.ollamaModel);
}