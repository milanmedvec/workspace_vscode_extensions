// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('open-file.openFilesFromList', async () => {
        const editor = vscode.window.activeTextEditor;
        let lines = [];

        if (editor) {
            const document = editor.document;
            lines = Array.from({ length: document.lineCount }, (_, i) =>
                document.lineAt(i).text.trim()
            );
        } else {
            const clipboardText = await vscode.env.clipboard.readText();
            if (!clipboardText.trim()) {
                vscode.window.showErrorMessage("No active editor and clipboard is empty.");
                return;
            }
            lines = clipboardText.split(/\r?\n/).map(l => l.trim());
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        const promises: Promise<void>[] = [];

        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            if (!lineText) continue;

            // Match file path and optional line number (like src/foo.ts:42)
            const match = lineText.match(/^(?:\s*\d+\s*)?(.*?)(?:(:(\d+))*)?$/);
            if (!match) {
                vscode.window.showWarningMessage(`Invalid line: ${lineText}`);
                continue;
            }

            let filePath = match[1];

            // Make relative paths absolute
            if (workspaceFolder && !path.isAbsolute(filePath)) {
                filePath = path.join(workspaceFolder, filePath);
            }

            const task = async () => {
                try {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc, { preview: false });
                } catch (err) {
                    vscode.window.showWarningMessage(`Could not open: ${filePath}`);
                }
            };

            promises.push(task());
        }

        await Promise.all(promises);

        vscode.window.showInformationMessage(`Opened ${promises.length} files.`);
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
