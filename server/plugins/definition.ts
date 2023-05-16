import * as LSP from "vscode-languageserver/node";
import type * as Markdoc from "@markdoc/markdoc";
import type { Config, ServiceInstances } from "../types";

export default class DefinitionProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onDefinition(this.onDefinition.bind(this));
    connection.onReferences(this.onReferences.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.DefinitionRequest.type, { documentSelector: null });
    registration.add(LSP.ReferencesRequest.type, { documentSelector: null });
  }

  getPartialAtLine(ast: Markdoc.Node, line: number): string | void {
    for (const node of ast.walk()) {
      if (!node.lines.includes(line)) continue;
      if (node.type !== "tag" || node.tag !== "partial") continue;

      const { file } = node.attributes;
      if (typeof file === "string") return file;
    }
  }

  onDefinition(params: LSP.DefinitionParams): LSP.Definition | null {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    if (!ast) return null;

    const file = this.getPartialAtLine(ast, params.position.line);
    if (!file) return null;

    const uri = this.services.Scanner.fullPath(file);
    return { uri, range: LSP.Range.create(0, 0, 0, 0) };
  }

  onReferences(params: LSP.ReferenceParams): LSP.Location[] | null {
    const ast = this.services.Documents.ast(params.textDocument.uri);
    if (!ast) return null;

    const file = this.getPartialAtLine(ast, params.position.line);
    if (!file) return null;

    const output: LSP.Location[] = [];
    for (const [key, { partials }] of this.services.Scanner.entries()) {
      const partial = partials.find((p) => p.attributes.file === file);
      if (!partial) continue;

      const [line] = partial?.lines ?? [];
      const uri = this.services.Scanner.fullPath(key);
      output.push({ uri, range: LSP.Range.create(line, 0, line, 0) });
    }

    return output;
  }
}
