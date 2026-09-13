import * as vscode from 'vscode';
import { askLLM, Task } from './llm';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('code-explainer.explainCode', () => run('explain')),
    vscode.commands.registerCommand('code-explainer.generateComment', () => run('comment'))
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