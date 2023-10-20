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

  async inlinePartial(uri: string, line: number, file: string): Promise<LSP.WorkspaceEdit | void> {
    const ast = this.services.Documents.ast(uri);
    if (!ast) return;

    for (const node of ast.walk()) {
      if (node.tag === 'partial' && node.lines[0] === line && !node.attributes.variables) {
        const fullPath = this.services.Scanner.fullPath(file);
        const newText = await this.services.Scanner.read(fullPath);
        const [start, end] = node.lines;
        const range = LSP.Range.create(start, 0, end, 0);
        return {changes: {[uri]: [{range, newText}]}};
      }
    }
  }
  
  findActions(ast: Markdoc.Node, params: LSP.CodeActionParams): LSP.CodeAction[] {
    const output: LSP.CodeAction[] = []; 
    const {line} = params.range.start;
    const {uri} = params.textDocument;

    if (params.range.end.line - params.range.start.line > 3)
      output.push({
        title: 'Extract content to new partial',
        command: LSP.Command.create('Extract Partial', 'markdoc.extractPartial')
      });
    
    for (const node of ast.walk()) {
      if (node.type === 'table' && node.lines.includes(line)) {
        output.push({
          data: {type: 'convertTable', uri, line},
          title: 'Convert to Markdoc Table',
        });

        continue;
      }

      if (node.tag === 'partial' && node.lines[0] === line && !node.attributes.variables) {
        output.push({
          data: {type: 'inlinePartial', uri, line, file: node.attributes.file},
          title: 'Inline contents of this partial',
        });
        
        continue;
      }
    }

    return output;
  }

  onCodeAction(params: LSP.CodeActionParams): (LSP.CodeAction | LSP.Command)[] {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    return ast ? this.findActions(ast, params) : [];
  }

  async onCodeActionResolve(action: LSP.CodeAction): Promise<LSP.CodeAction> {
    if (!action.data?.type) return action;

    if (action.data.type === 'convertTable') {
      const {uri, line} = action.data;
      const edit = this.convertTable(uri, line);
      if (edit) return {...action, edit};
    }

    if (action.data.type === 'inlinePartial') {
      const {uri, line, file} = action.data;
      const edit = await this.inlinePartial(uri, line, file);
      if (edit) return {...action, edit};
    }

    return action;
  }
}