import * as LSP from "vscode-languageserver/node";
import { toPlainText } from "../utils";
import type { Config, ServiceInstances } from "../types";
import type * as Markdoc from "@markdoc/markdoc";

export default class SymbolProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.DocumentSymbolRequest.type, {
      documentSelector: null,
    });
  }

  headings(node: Markdoc.Node) {
    let stack: Array<Partial<LSP.DocumentSymbol> & { level: number }> =
      [{ level: 0, children: [] }];

    for (const child of node.walk()) {
      if (child.type !== "heading" || typeof child.attributes.level !== 'number')
        continue;

      const [start, finish] = child.lines;
      if (!start || !finish) continue;

      const range = LSP.Range.create(start, 0, finish + 1, 0);
      const entry = {
        name: `${"#".repeat(child.attributes.level)} ${toPlainText(child)}`,
        level: child.attributes.level,
        kind: LSP.SymbolKind.Key,
        range,
        selectionRange: range,
        children: [],
      };

      while (entry.level <= stack[stack.length - 1].level)
        stack.pop();

      stack[stack.length - 1].children?.push(entry);

      if (entry.level > stack[stack.length - 1].level)
        stack.push(entry);
    }

    return stack[0].children;
  }

  onDocumentSymbol({ textDocument }: LSP.DocumentSymbolParams) {
    const ast = this.services.Documents.ast(textDocument.uri);
    return ast && this.headings(ast);
  }
}
