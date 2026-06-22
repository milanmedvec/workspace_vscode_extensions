// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function extractFilePaths(text: string): string[] {
    console.log(text);
    const filePaths = new Set<string>();

    // Example of copied search output looks like:
    // src/app/main.ts:
    //   12:  const foo = 'bar';
    // src/utils/helpers.ts:
    //   5:  function help() {}

    // Regex for file path detection (lines ending with ":")
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(/^\/.+$/);
        if (match) {
            const path = match[0].trim();
            if (path) filePaths.add(path);
        }
    }

    return Array.from(filePaths);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('open-search-results.open', async () => {
        try {
            // Step 1: Run built-in copy command
            await vscode.commands.executeCommand('search.action.copyAll');

            // Step 2: Get clipboard contents
            const clipboardText = await vscode.env.clipboard.readText();

            if (!clipboardText || !clipboardText.trim()) {
                vscode.window.showWarningMessage('No search results to open.');
                return;
            }

            // Step 3: Extract file paths from copied search results
            const filePaths = extractFilePaths(clipboardText);

            if (filePaths.length === 0) {
                vscode.window.showInformationMessage('No file paths found in search results.');
                return;
            }

            // Step 4: Open each file
            for (const filePath of filePaths) {
                try {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
                } catch (err) {
                    console.warn(`Could not open file ${filePath}`, err);
                }
            }

            vscode.window.showInformationMessage(`Opened ${filePaths.length} files from search results.`);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open files from search panel: ${err}`);
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
