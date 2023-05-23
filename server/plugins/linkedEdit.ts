import * as LSP from "vscode-languageserver/node";
import * as utils from "../utils";
import type { Config, ServiceInstances } from "../types";

export default class LinkedEditProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.languages.onLinkedEditingRange(
      this.onLinkedEditingRange.bind(this)
    );
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.LinkedEditingRangeRequest.type, {
      documentSelector: null,
    });
  }

  onLinkedEditingRange(
    params: LSP.LinkedEditingRangeParams
  ): LSP.LinkedEditingRanges | undefined {
    const doc = this.services.Documents.get(params.textDocument.uri);
    const ast = this.services.Documents.ast(params.textDocument.uri);
    if (!ast || !doc) return;

    for (const { start, end, tag } of utils.getBlockRanges(ast))
      if (tag && [start, end].includes(params.position.line)) {
        const open = utils.getContentRangeInLine(start, doc, tag);
        const close = utils.getContentRangeInLine(end, doc, tag);
        return { ranges: [open, close] };
      }
  }
}
