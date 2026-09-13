import * as vscode from 'vscode';
import { askLLM, Task } from './llm';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('code-explainer.explainCode', () => run('explain')),
    vscode.commands.registerCommand('code-explainer.generateComment', () => run('comment')),
    vscode.commands.registerCommand('code-explainer.selectModel', selectModel)
  );
}

/**
 * 以交互方式切换服务商与模型，写回工作区/用户设置。
 */
async function selectModel() {
  const cfg = vscode.workspace.getConfiguration('codeExplainer');

  // 1. 选服务商
  const providers = [
    { label: '本地 Ollama', value: 'ollama' as const },
    { label: 'DeepSeek', value: 'deepseek' as const },
    { label: 'OpenAI', value: 'openai' as const }
  ];
  const currentProvider = cfg.get<string>('provider', 'ollama');
  const pickedProvider = await vscode.window.showQuickPick(
    providers.map((p) => ({ label: p.label, value: p.value, picked: p.value === currentProvider })),
    { placeHolder: `当前服务商：${currentProvider}` }
  );
  if (!pickedProvider) {
    return;
  }
  await cfg.update('provider', pickedProvider.value, vscode.ConfigurationTarget.Global);

  // 2. 选 / 填模型名
  let modelKey = '';
  let presets: string[] = [];
  if (pickedProvider.value === 'ollama') {
    modelKey = 'ollama.model';
    presets = ['qwen2.5-coder:7b', 'qwen2.5-coder:3b', 'qwen2.5-coder:1.5b-base'];
  } else if (pickedProvider.value === 'deepseek') {
    modelKey = 'deepseek.model';
    presets = ['deepseek-flash', 'deepseek-v4-pro', 'deepseek-v4-flash'];
  } else {
    modelKey = 'openai.model';
    presets = ['gpt-4o-mini', 'gpt-4o'];
  }

  const currentModel = cfg.get<string>(modelKey, '');
  const items: vscode.QuickPickItem[] = [
    ...presets.map((m) => ({ label: m, picked: m === currentModel })),
    { label: '$(edit) 手动输入模型名…' }
  ];
  const pickedModel = await vscode.window.showQuickPick(items, {
    placeHolder: `当前模型：${currentModel}（选择或手动输入）`
  });
  if (!pickedModel) {
    return;
  }

  let model = pickedModel.label;
  if (model.startsWith('$(edit)')) {
    const input = await vscode.window.showInputBox({
      prompt: '请输入模型名',
      value: currentModel
    });
    if (!input) {
      return;
    }
    model = input.trim();
  }
  await cfg.update(modelKey, model, vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage(
    `Code Explainer 已切换：${pickedProvider.label} / ${model}`
  );
}

async function run(task: Task) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('没有打开的活动编辑器');
    return;
  }

  const code = editor.document.getText(editor.selection);
  if (!code.trim()) {
    vscode.window.showWarningMessage('请先选中一段代码');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: task === 'explain' ? '正在解释代码…' : '正在生成注释…',
      cancellable: false
    },
    async () => {
      try {
        const result = await askLLM(code, task, editor.document.languageId);
        await showResult(result, task, editor);
      } catch (err) {
        vscode.window.showErrorMessage(`调用模型失败：${(err as Error).message}`);
      }
    }
  );
}

async function showResult(text: string, task: Task, editor: vscode.TextEditor) {
  // 解释结果：在右侧打开一个只读 markdown 预览
  if (task === 'explain') {
    const doc = await vscode.workspace.openTextDocument({
      content: text,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false
    });
    return;
  }

  // 生成注释：让用户确认后再替换，避免误伤原代码
  const pick = await vscode.window.showInformationMessage(
    '是否用生成的注释替换选中的代码？',
    { modal: true },
    '替换',
    '在新标签页打开'
  );

  if (pick === '替换') {
    await editor.edit((b) => b.replace(editor.selection, text));
    return;
  }

  const doc = await vscode.workspace.openTextDocument({
    content: text,
    language: editor.document.languageId
  });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}

export function deactivate() {}