# Code Explainer

解释代码 / 生成注释的 VS Code 扩展，支持**本地 Ollama**、**OpenAI** 和 **DeepSeek** 三种模型来源。

## 功能

- **解释这段代码**：用中文分点解释选中代码的作用、关键逻辑与潜在问题，结果在右侧只读标签页展示。
- **为这段代码生成注释**：生成带中文注释的完整代码，替换前会先弹窗确认，避免误伤原代码。
- **切换模型 / 服务商**：一键在 Ollama / OpenAI / DeepSeek 之间切换，并选择或手动输入模型名。
- 所有请求带 **120 秒超时**，卡住时会明确报错而不是无限等待。

## 安装

### 方式一：从 VSIX 安装（推荐）

```shell
code --install-extension code-explainer-0.0.2.vsix
```

### 方式二：开发调试

用 VS Code 打开 `code-explainer` 文件夹，按 `F5` 启动"扩展开发宿主"窗口测试。

## 配置

在设置里搜索 `Code Explainer`，按需配置 `codeExplainer.provider`。

### 本地 Ollama（默认）

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `codeExplainer.provider` | `ollama` | 模型来源 |
| `codeExplainer.ollama.endpoint` | `http://localhost:11434` | Ollama 地址 |
| `codeExplainer.ollama.model` | `qwen2.5-coder:7b` | 本地模型名 |

> 需要先安装并启动 [Ollama](https://ollama.com/)，并 `ollama pull qwen2.5-coder:7b`。

### DeepSeek（OpenAI 兼容）

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `codeExplainer.provider` | `deepseek` | 设为 deepseek |
| `codeExplainer.deepseek.baseUrl` | `https://api.deepseek.com` | API 地址 |
| `codeExplainer.deepseek.apiKey` | （空） | **填你的 DeepSeek API Key** |
| `codeExplainer.deepseek.model` | `deepseek-flash` | 可用 `deepseek-flash` / `deepseek-v4-pro` |

### OpenAI

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `codeExplainer.openai.baseUrl` | `https://api.openai.com/v1` | API 地址 |
| `codeExplainer.openai.apiKey` | （空） | 填你的 OpenAI API Key |
| `codeExplainer.openai.model` | `gpt-4o-mini` | 模型名 |

## 使用

1. 在编辑器里**选中一段代码**；
2. 右键选择 **解释这段代码** 或 **为这段代码生成注释**；
3. 想换模型时，右键选择 **Code Explainer: 切换模型 / 服务商**，按提示切换。

## 打包

```shell
npm install
npx @vscode/vsce package
```

会生成 `code-explainer-<version>.vsix`。

## 开发

```shell
npm install
npm run compile    # 或 npm run watch
```