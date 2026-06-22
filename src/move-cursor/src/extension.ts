// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const moveCursor = (lineDelta: number, colDelta: number) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const newSelections = editor.selections.map(sel => {
            const pos = sel.active;
            const newPos = pos.with(
                Math.max(0, pos.line + lineDelta),
                Math.max(0, pos.character + colDelta)
            );
            return new vscode.Selection(newPos, newPos);
        });

        editor.selections = newSelections;
        editor.revealRange(newSelections[0]);
    };

    const goToBeginBracket = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const doc = editor.document;
        const pos = editor.selection.active;
        const text = doc.getText();

        // Convert current cursor position to offset
        const offset = doc.offsetAt(pos);

        // Bracket pairs
        const brackets: Record<string, string> = {
            ')': '(',
            ']': '[',
            '}': '{'
        };

        // Search backwards from cursor for closing → opening bracket
        let depth = 0;
        for (let i = offset - 2; i >= 0; i--) {
            if (i < 0) {
                break;
            }

            const ch = text[i];
            if (Object.values(brackets).includes(ch)) {
                if (depth === 0) {
                    // Found the matching opening bracket
                    const newPos = doc.positionAt(i+1);
                    editor.selection = new vscode.Selection(newPos, newPos);
                    editor.revealRange(new vscode.Range(newPos, newPos));
                    return;
                } else {
                    depth--;
                }
            } else if (Object.keys(brackets).includes(ch)) {
                depth++;
            }
        }

        vscode.window.showInformationMessage('No matching opening bracket found.');
    };

    const goToEndBracket = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const doc = editor.document;
        const pos = editor.selection.active;
        const text = doc.getText();

        // Convert current cursor position to offset
        const offset = doc.offsetAt(pos);

        // Bracket pairs
        const brackets: Record<string, string> = {
            ')': '(',
            ']': '[',
            '}': '{'
        };

        // Search backwards from cursor for closing → opening bracket
        let depth = 0;
        for (let i = offset + 1; i < text.length; i++) {
            const ch = text[i];
            if (Object.keys(brackets).includes(ch)) {
                if (depth === 0) {
                    // Found the matching opening bracket
                    const newPos = doc.positionAt(i);
                    editor.selection = new vscode.Selection(newPos, newPos);
                    editor.revealRange(new vscode.Range(newPos, newPos));
                    return;
                } else {
                    depth--;
                }
            } else if (Object.values(brackets).includes(ch)) {
                depth++;
            }
        }

        vscode.window.showInformationMessage('No matching opening bracket found.');
    };

    const commands = [
        vscode.commands.registerCommand(
            'move-cursor.goToBeginBracket',
            goToBeginBracket
        ),
        vscode.commands.registerCommand(
            'move-cursor.goToEndBracket',
            goToEndBracket
        ),
        vscode.commands.registerCommand('move-cursor.moveUp5', () => moveCursor(-5, 0)),
        vscode.commands.registerCommand('move-cursor.moveDown5', () => moveCursor(5, 0)),
        vscode.commands.registerCommand('move-cursor.moveLeft20', () => moveCursor(0, -20)),
        vscode.commands.registerCommand('move-cursor.moveRight20', () => moveCursor(0, 20))
    ];

    context.subscriptions.push(...commands);
}

// This method is called when your extension is deactivated
export function deactivate() { }
