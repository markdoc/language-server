import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";

import type { Config, ServiceInstances } from "../types";

export default class CodeActionProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onCodeAction(this.onCodeAction.bind(this));
    connection.onCodeActionResolve(this.onCodeActionResolve.bind(this));
  }
  
  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.CodeActionRequest.type, {documentSelector: null, resolveProvider: true});
  }

  convertTable(uri: string, line: number): LSP.WorkspaceEdit | void {
    const ast = this.services.Documents.ast(uri);
    if (!ast) return;

    for (const node of ast.walk()) {
      if (node.type === 'table' && node.lines.includes(line)) {
        const content = new Markdoc.Ast.Node('tag', {}, [node], 'table');
        const newText = Markdoc.format(content);
        const [start, end] = node.lines;
        const range = LSP.Range.create(start, 0, end + 1, 0);
        return {changes: {[uri]: [{range, newText}]}};
      }
    }
  }

  findTables(ast: Markdoc.Node, params: LSP.CodeActionParams): LSP.CodeAction[] {
    const output: LSP.CodeAction[] = []; 
    const {line} = params.range.start;
    const {uri} = params.textDocument;
    
    for (const node of ast.walk())
      if (node.type === 'table' && node.lines.includes(line))
        output.push({
          data: {type: 'convertTable', uri, line},
          title: 'Convert to Markdoc Table',
        });

    return output;
  }

  onCodeAction(params: LSP.CodeActionParams): (LSP.CodeAction | LSP.Command)[] {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    return ast ? this.findTables(ast, params) : [];
  }

  onCodeActionResolve(action: LSP.CodeAction): LSP.CodeAction {
    if (action.data.type === 'convertTable') {
      const {uri, line} = action.data;
      const edit = this.convertTable(uri, line);
      if (edit) return {...action, edit};
    }

    return action;
  }
}