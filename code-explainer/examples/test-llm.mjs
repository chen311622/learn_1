// 独立的运行验证脚本：不依赖 VSCode，直接调用本地 Ollama。
// 用法: node examples/test-llm.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENDPOINT = (process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434').replace(/\/$/, '');
const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:7b';

// 与 src/llm.ts 中完全一致的 prompt 构造逻辑
function buildPrompt(code, task, languageId) {
  const body = `语言: ${languageId}\n\`\`\`\n${code}\n\`\`\``;
  if (task === 'explain') {
    return `你是一位资深工程师。请用中文解释下面这段代码的作用、关键逻辑和潜在问题，分点说明：\n${body}`;
  }
  return `请为下面的代码生成高质量的中文注释。要求：只添加注释，不改动原有的代码逻辑，直接返回带注释的完整代码：\n${body}`;
}

async function callOllama(prompt) {
  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    throw new Error(`Ollama 请求失败 ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.message?.content ?? '';
}

const sampleCode = `export function fibonacci(n) {
  const result = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    result.push(a);
    [a, b] = [b, a + b];
  }
  return result;
}`;

async function main() {
  const sections = [];
  for (const task of ['explain', 'comment']) {
    const label = task === 'explain' ? '解释这段代码' : '为这段代码生成注释';
    process.stdout.write(`\n[${label}] 正在请求 ${MODEL} ...\n`);
    const t0 = Date.now();
    const reply = await callOllama(buildPrompt(sampleCode, task, 'javascript'));
    const ms = Date.now() - t0;
    process.stdout.write(`[${label}] 完成，耗时 ${ms}ms，返回 ${reply.length} 字符\n`);
    sections.push(`## ${label}\n\n${reply}\n\n> 耗时 ${ms}ms，模型 ${MODEL}\n`);
  }

  const md = `# Code Explainer 运行验证\n\n- 模型: \`${MODEL}\`\n- 接口: \`${ENDPOINT}\`\n\n${sections.join('\n---\n\n')}`;
  const outFile = join(__dirname, 'test-output.md');
  writeFileSync(outFile, md, 'utf8');
  process.stdout.write(`\n结果已写入: ${outFile}\n`);
}

main().catch((err) => {
  console.error('运行失败:', err.message);
  process.exit(1);
});