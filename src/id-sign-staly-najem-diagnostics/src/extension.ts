// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('contentWarnings');
    context.subscriptions.push(diagnosticCollection);

    // Function to check a document for warnings
    const updateDiagnostics = (doc: vscode.TextDocument) => {
        if (doc.languageId === 'typescript' || doc.languageId === 'typescriptreact') {
            const diagnostics: vscode.Diagnostic[] = [];
            const text = doc.getText();

            {
                const pattern = /withServerActionInstrumentation/gi;
                let match;
                while ((match = pattern.exec(text))) {
                    const startPos = doc.positionAt(match.index);
                    const endPos = doc.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `⚠️ Check action name for "${match[0]}"`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostics.push(diagnostic);
                }
            }

            {
                // Matches: const SOME_NAME = gql(/* GraphQL */ `...`)
                const gqlRegex = /const\s+([A-Z0-9_]+)\s*=\s*gql\s*\(\s*\/\*[\s\S]*?\*\/\s*`([\s\S]*?)`\s*\)/g;
                let gqlMatch;
                while ((gqlMatch = gqlRegex.exec(text))) {
                    const constName = gqlMatch[1];
                    const gqlContent = gqlMatch[2];

                    const isMutation = /\bmutation\b/i.test(gqlContent);
                    const isQuery = /\bquery\b/i.test(gqlContent);

                    const hasMutationSuffix = constName.endsWith('_MUTATION');
                    const hasQuerySuffix = constName.endsWith('_QUERY');

                    let message: string | undefined;

                    if (isMutation && !hasMutationSuffix) {
                        message = `GraphQL mutation constant "${constName}" should end with "_MUTATION".`;
                    } else if (isQuery && !hasQuerySuffix) {
                        message = `GraphQL query constant "${constName}" should end with "_QUERY".`;
                    }

                    if (message) {
                        const startPos = doc.positionAt(gqlMatch.index);
                        const endPos = doc.positionAt(gqlMatch.index + gqlMatch[0].length);
                        diagnostics.push(
                            new vscode.Diagnostic(
                                new vscode.Range(startPos, endPos),
                                `⚠️ ${message}`,
                                vscode.DiagnosticSeverity.Warning
                            )
                        );
                    }
                }
            }

            {
                const pageFunctionRegex =
                    /export\s+default\s+(?:async\s+)?function\s+Page\s*\(\s*.*\s*:\s*([A-Za-z0-9_<>,'" ]+)\)/g;

                let pageMatch;
                while ((pageMatch = pageFunctionRegex.exec(text))) {
                    const propsType = pageMatch[1].trim();

                    // Check if type starts with "PageProps"
                    const isPageProps =
                        propsType === 'PageProps' || /^PageProps\s*<.*>$/.test(propsType);

                    if (!isPageProps) {
                        const startPos = doc.positionAt(pageMatch.index);
                        const endPos = doc.positionAt(pageMatch.index + pageMatch[0].length);

                        diagnostics.push(
                            new vscode.Diagnostic(
                                new vscode.Range(startPos, endPos),
                                `⚠️ Page component should use "PageProps<...>" as its props type (found "${propsType}").`,
                                vscode.DiagnosticSeverity.Warning
                            )
                        );
                    }
                }
            }

            {
                const pageWithBodyRegex =
                    /export\s+default\s+(?:async\s+)?function\s+Page\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;

                let pageBodyMatch;
                while ((pageBodyMatch = pageWithBodyRegex.exec(text))) {
                    const bodyContent = pageBodyMatch[1];

                    const hasRequireSession = /await\s+requireSession\s*\(/.test(bodyContent);
                    const hasRequirePrivilegedSession = /await\s+requirePrivilegedSession\s*\(/.test(bodyContent);

                    if (!hasRequireSession && !hasRequirePrivilegedSession) {
                        const startPos = doc.positionAt(pageBodyMatch.index);
                        const endPos = doc.positionAt(pageBodyMatch.index + pageBodyMatch[0].length);

                        diagnostics.push(
                            new vscode.Diagnostic(
                                new vscode.Range(startPos, endPos),
                                `⚠️ Page component must call "await requireSession();" inside its body.`,
                                vscode.DiagnosticSeverity.Error
                            )
                        );
                    }
                }
            }

            /*{
                const serverActionRegex = /withServerActionInstrumentation\s*\(\s*(async\s+function\s*\([^)]*\)\s*\{([\s\S]*?)\})\s*\)/g;

                let match;
                while ((match = serverActionRegex.exec(text))) {
                    const functionBody = match[2]; // captured body inside braces

                    // Check if await requireSession is present
                    const hasRequireSession = /await\s+requireSession\s*\(/.test(functionBody);

                    if (!hasRequireSession) {
                        const startPos = doc.positionAt(match.index);
                        const endPos = doc.positionAt(match.index + match[1].length);

                        diagnostics.push(
                            new vscode.Diagnostic(
                                new vscode.Range(startPos, endPos),
                                `⚠️ Functions wrapped with "withServerActionInstrumentation" must call "await requireSession();" inside.`,
                                vscode.DiagnosticSeverity.Warning
                            )
                        );
                    }
                }
            }*/

            {
                const importAllRegex = /import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+['"][^'"]+['"]/g;

                let importMatch;
                while ((importMatch = importAllRegex.exec(text))) {
                    const startPos = doc.positionAt(importMatch.index);
                    const endPos = doc.positionAt(importMatch.index + importMatch[0].length);

                    diagnostics.push(
                        new vscode.Diagnostic(
                            new vscode.Range(startPos, endPos),
                            `⚠️ Using "import * as" is not allowed. Consider named imports instead.`,
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
            }

            {
                const importAllRegex = /import.*from.*zod\/v3/g;

                let importMatch;
                while ((importMatch = importAllRegex.exec(text))) {
                    const startPos = doc.positionAt(importMatch.index);
                    const endPos = doc.positionAt(importMatch.index + importMatch[0].length);

                    diagnostics.push(
                        new vscode.Diagnostic(
                            new vscode.Range(startPos, endPos),
                            `⚠️ Zod/V3 is deprecated. Use Zod/V4 instead.`,
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
            }

            {
                const importAllRegex = /as\s+unknown\s+as\s+LocalFormState/g;

                let importMatch;
                while ((importMatch = importAllRegex.exec(text))) {
                    const startPos = doc.positionAt(importMatch.index);
                    const endPos = doc.positionAt(importMatch.index + importMatch[0].length);

                    diagnostics.push(
                        new vscode.Diagnostic(
                            new vscode.Range(startPos, endPos),
                            `⚠️ Using "as unknown as LocalFormState" is not allowed.`,
                            vscode.DiagnosticSeverity.Error
                        )
                    );
                }
            }

            {
                const pattern = /createFormState\s*\(\s*FormStatus\.Error\s*,\s*z\.treeifyError\(parsed\.error\)\s*\)/g;

                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const startPos = doc.positionAt(match.index);
                    const endPos = doc.positionAt(match.index + match[0].length);
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(startPos, endPos),
                        message: 'Missing formData argument in createFormState call.',
                        code: 'missing-formdata',
                        source: 'formstate-rule',
                    });
                }
            }

            diagnosticCollection.set(doc.uri, diagnostics);
        }
    };

    // Update on open or change
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
        vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document)),
        vscode.workspace.onDidCloseTextDocument(doc => diagnosticCollection.delete(doc.uri))
    );
}

// This method is called when your extension is deactivated
export function deactivate() { }
