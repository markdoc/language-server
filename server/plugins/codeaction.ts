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
  }
  
  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.CodeActionRequest.type, {documentSelector: null});
  }

  findTables(ast: Markdoc.Node, params: LSP.CodeActionParams): LSP.Command[] {
    const output: LSP.Command[] = []; 
    const {line} = params.range.start;
    const {uri} = params.textDocument;
    
    for (const node of ast.walk())
      if (node.type === 'table' && node.lines.includes(line))
        output.push({
          command: 'markdoc.convertTable',
          title: 'Convert to Markdoc Table',
          arguments: [uri, line]
        });

    return output;
  }

  onCodeAction(params: LSP.CodeActionParams): (LSP.CodeAction | LSP.Command)[] {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    return ast ? this.findTables(ast, params) : [];
  }
}