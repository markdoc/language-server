import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";

import type { Config, ServiceInstances } from "../types";
import { TextDocument } from "vscode-languageserver-textdocument";

export default class FormattingProvider {
  protected tokenizer: Markdoc.Tokenizer;

  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    this.tokenizer = new Markdoc.Tokenizer(config.markdoc ?? {});
    connection.onDocumentFormatting(this.onDocumentFormatting.bind(this));
    connection.onDocumentRangeFormatting(this.onRangeFormatting.bind(this));
    services.Commands.add('markdoc.convertTable', this.convertTable.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.DocumentFormattingRequest.type, {
      documentSelector: null,
    });

    registration.add(LSP.DocumentRangeFormattingRequest.type, {
      documentSelector: null,
    });
  }
  
  convertTable(uri: string, line: number) {
    const ast = this.services.Documents.ast(uri);
    if (!ast) return;

    for (const node of ast.walk())
      if (node.type === 'table' && node.lines.includes(line)) {
        const content = new Markdoc.Ast.Node('tag', {}, [node], 'table');
        const newText = Markdoc.format(content);
        const [start, end] = node.lines;
        const range = LSP.Range.create(start, 0, end + 1, 0);

        const wschange = new LSP.WorkspaceChange();
        const edit = wschange.getTextEditChange(uri);
        edit.replace(range, newText);
        this.connection.workspace.applyEdit(wschange.edit);
      }
  }

  formatRange(doc: TextDocument, range?: LSP.Range) {
    const actualRange = range
      ? LSP.Range.create(range.start.line, 0, range.end.line + 1, 0)
      : LSP.Range.create(0, 0, doc.lineCount, 0);

    const text = doc.getText(actualRange);
    const tokens = this.tokenizer.tokenize(text);
    const ast = Markdoc.parse(tokens, { slots: this.config.markdoc?.slots });
    const output = Markdoc.format(ast);

    return [LSP.TextEdit.replace(actualRange, output)];
  }

  onDocumentFormatting(params: LSP.DocumentFormattingParams) {
    const doc = this.services.Documents.get(params.textDocument.uri);
    return doc && this.formatRange(doc);
  }

  onRangeFormatting(params: LSP.DocumentRangeFormattingParams) {
    const doc = this.services.Documents.get(params.textDocument.uri);
    return doc && this.formatRange(doc, params.range);
  }
}
