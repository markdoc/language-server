import * as LSP from "vscode-languageserver/node";
import * as utils from "../utils";
import type { Config, ServiceInstances } from "../types";

export default class LinkProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onDocumentLinks(this.onDocumentLinks.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.DocumentLinkRequest.type, { documentSelector: null });
  }

  protected onDocumentLinks({ textDocument: { uri } }: LSP.DocumentLinkParams) {
    const { Documents, Scanner } = this.services;
    const doc = Documents.get(uri);
    const ast = Documents.ast(uri);

    if (!ast || !doc) return [];

    const links: LSP.DocumentLink[] = [];
    for (const node of ast.walk()) {
      if (node.type === "link" && node.attributes.href?.startsWith("/")) {
        const { href } = node.attributes;
        if (typeof href !== "string") continue;

        const [url] = href.split("#");
        const relative = Scanner.routes.get(url);
        if (!relative) continue;

        const range = utils.getContentRangeInLine(node.lines[0], doc, href);
        links.push({ target: Scanner.fullPath(relative), range });
        continue;
      }

      if (node.type === "tag" && node.tag === "partial") {
        const { file } = node.attributes;
        if (typeof file !== "string") continue;

        const range = utils.getContentRangeInLine(node.lines[0], doc, file);
        links.push({ target: Scanner.fullPath(file), range });
      }
    }

    return links;
  }
}
