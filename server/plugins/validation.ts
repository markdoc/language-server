import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";
import { URI } from "vscode-uri";

import type { Config, ServiceInstances, TextChangeEvent } from "../types";

export default class ValidationProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    services.Documents.onDidSave(this.onValidate, this);
    services.Documents.onDidClose(this.onDidClose, this);
    services.Documents.onDidChangeContent(this.onValidate, this);
  }

  severity(level: string): LSP.DiagnosticSeverity {
    const { Information, Warning, Error } = LSP.DiagnosticSeverity;
    switch (level) {
      case "debug":
      case "info":
        return Information;
      case "warning":
        return Warning;
      default:
        return Error;
    }
  }

  diagnostic(err: Markdoc.ValidateError): LSP.Diagnostic {
    const {
      lines: [line],
      location,
      error,
    } = err;

    return {
      range: this.createRange(line, error.location ?? location),
      severity: this.severity(error.level),
      message: error.message,
      source: `markdoc ${this.config.id ?? ""}`,
    };
  }

  createRange(line: number, location?: Markdoc.Location): LSP.Range {
    const { start, end } = location ?? {};
    if (start?.character && end?.character)
      return LSP.Range.create(
        start.line,
        start.character,
        end.line - 1,
        end.character
      );

    return LSP.Range.create(line, 0, line + 1, 0);
  }

  onValidate({ document: { uri } }: TextChangeEvent) {
    const doc = this.services.Documents.ast(uri);
    const schema = this.services.Schema.get();

    if (!schema || !doc) return;

    const config = this.configuration(uri);
    const errors = Markdoc.validate(doc, config);
    const diagnostics = errors.map((err) => this.diagnostic(err));
    this.connection.sendDiagnostics({ uri, diagnostics });
  }

  configuration(uri: string): Markdoc.Config {
    const { Scanner, Schema } = this.services;
    const file = URI.parse(uri).fsPath;
    const metadata = Scanner.get(file);

    const partials: { [key: string]: boolean } = {};
    for (const part of metadata?.partials ?? [])
      if (Scanner.has(part.attributes.file))
        partials[part.attributes.file] = true;

    return { ...Schema?.get(), partials };
  }

  onDidClose({ document: { uri } }: TextChangeEvent) {
    this.connection.sendDiagnostics({ uri, diagnostics: [] });
  }
}
