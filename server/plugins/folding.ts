import * as LSP from "vscode-languageserver/node";
import type * as Markdoc from "@markdoc/markdoc";
import type { Config, ServiceInstances } from "../types";
import * as utils from "../utils";

export default class FoldingProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onFoldingRanges(this.onFoldingRange.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.FoldingRangeRequest.type, { documentSelector: null });
  }

  protected ranges(ast: Markdoc.Node) {
    return Array.from(utils.getBlockRanges(ast)).map(({ start, end }) =>
      LSP.FoldingRange.create(start, end)
    );
  }

  protected onFoldingRange(params: LSP.FoldingRangeParams): LSP.FoldingRange[] {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    return ast ? this.ranges(ast) : [];
  }
}
