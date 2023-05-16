import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";

import type { Config, ServiceInstances } from "../types";
import { TextDocument } from "vscode-languageserver-textdocument";

export default class FormattingProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onDocumentFormatting(this.onDocumentFormatting.bind(this));
    connection.onDocumentRangeFormatting(this.onRangeFormatting.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.DocumentFormattingRequest.type, {
      documentSelector: null,
    });

    registration.add(LSP.DocumentRangeFormattingRequest.type, {
      documentSelector: null,
    });
  }

  protected formatRange(doc: TextDocument, range?: LSP.Range) {
    const actualRange = range
      ? LSP.Range.create(range.start.line, 0, range.end.line + 1, 0)
      : LSP.Range.create(0, 0, doc.lineCount, 0);

    const text = doc.getText(actualRange);
    const ast = Markdoc.parse(text);
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
