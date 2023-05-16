import * as LSP from "vscode-languageserver/node";
import type * as Markdoc from "@markdoc/markdoc";
import type { Config, ServiceInstances } from "../types";

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
    const ranges: LSP.FoldingRange[] = [];
    for (const { type, lines } of ast.walk())
      if (type === "tag" && lines.length === 4)
        ranges.push(LSP.FoldingRange.create(lines[0], lines[2]));
    return ranges;
  }

  protected onFoldingRange(params: LSP.FoldingRangeParams): LSP.FoldingRange[] {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    return ast ? this.ranges(ast) : [];
  }
}
