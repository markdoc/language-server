import * as LSP from "vscode-languageserver/node";
import * as utils from "../utils";
import type { Config, ServiceInstances } from "../types";
import type * as Markdoc from "@markdoc/markdoc";

export default class SelectionRangeProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onSelectionRanges(this.onSelectionRange.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.SelectionRangeRequest.type, {
      documentSelector: null,
    });
  }

  findSelectionRange(ast: Markdoc.Node, position: LSP.Position) {
    let currentRange: LSP.SelectionRange | undefined;
    for (const range of utils.getBlockRanges(ast)) {
      if (range.start > position.line) break;
      if (range.end > position.line) {
        currentRange = {
          range: LSP.Range.create(range.start + 1, 0, range.end, 0),
          parent: {
            range: LSP.Range.create(range.start, 0, range.end + 1, 0),
            parent: currentRange,
          },
        };
      }
    }

    return currentRange ?? { range: LSP.Range.create(position, position) };
  }

  onSelectionRange({ textDocument, positions }: LSP.SelectionRangeParams) {
    const ast = this.services.Documents.ast(textDocument.uri);
    if (ast)
      return positions.map((position) =>
        this.findSelectionRange(ast, position)
      );
  }
}
