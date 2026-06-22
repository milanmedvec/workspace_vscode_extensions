import * as vscode from "vscode";
import * as ts from "typescript";

const TEXT_ATTRIBUTES = new Set([
    "title",
    "label",
    "placeholder",
    "aria-label",
    "alt"
]);

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection("i18n-checker");
    context.subscriptions.push(diagnosticCollection);

    if (vscode.window.activeTextEditor) {
        runDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    // Re-run diagnostics on document change
    vscode.workspace.onDidChangeTextDocument(e => {
        runDiagnostics(e.document, diagnosticCollection);
    });

    vscode.workspace.onDidOpenTextDocument(doc => {
        runDiagnostics(doc, diagnosticCollection);
    });
}

export function deactivate() { }

function runDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection
) {
    if (!document.fileName.endsWith(".tsx") && !document.fileName.endsWith(".jsx")) {
        collection.set(document.uri, []);
        return;
    }

    const sourceFile = ts.createSourceFile(
        document.fileName,
        document.getText(),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
    );

    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ts.Node) => {
        // Detect <div>Hello</div>
        if (ts.isJsxText(node)) {
            const text = node.getText().trim();

            if (text && !text.startsWith("{") && !isWrappedInT(text)) {
                const range = convertRange(document, node);
                diagnostics.push(
                    new vscode.Diagnostic(
                        range,
                        `Untranslated text in JSX: "${text}"`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }

        // Detect attributes like <Button title="Save" />
        // Detect attributes like <Button title="Save" />, but ignore non-text attributes
        if (ts.isJsxAttribute(node)) {
            const attrName = node.name.getText();

            // Skip non-text attributes (e.g., className, id, type, src, etc.)
            if (!TEXT_ATTRIBUTES.has(attrName)) {
                return;
            }

            if (node.initializer && ts.isStringLiteral(node.initializer)) {
                const value = node.initializer.text.trim();

                if (value && !isWrappedInT(value)) {
                    const range = convertRange(document, node.initializer);
                    diagnostics.push(
                        new vscode.Diagnostic(
                            range,
                            `Untranslated string literal in JSX "${attrName}": "${value}"`,
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
            }
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    collection.set(document.uri, diagnostics);
}

//
// Helpers
//

function isWrappedInT(text: string): boolean {
    // Basic checker: expand this if needed
    // detects: t("Hello"), {t("Hello")}
    return text.includes("t(");
}

function convertRange(
    doc: vscode.TextDocument,
    node: ts.Node
): vscode.Range {
    const start = doc.positionAt(node.getStart());
    const end = doc.positionAt(node.getEnd());
    return new vscode.Range(start, end);
}
