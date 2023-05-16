import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";
import { TextDocument, DocumentUri } from "vscode-languageserver-textdocument";

import type { Config, TextChangeEvent } from "../types";

export default class Documents<
  TConfig extends Config = Config
> extends LSP.TextDocuments<TextDocument> {
  protected asts = new Map<DocumentUri, Markdoc.Node>();
  protected tokenizer: Markdoc.Tokenizer;

  constructor(protected config: TConfig, protected connection: LSP.Connection) {
    super(TextDocument);

    this.tokenizer = new Markdoc.Tokenizer(config.markdoc ?? {});
    this.onDidOpen(this.handleChange, this);
    this.onDidSave(this.handleChange, this);
    this.onDidClose(this.handleClose, this);
    this.onDidChangeContent(this.handleChange, this);
    this.listen(connection);
  }

  ast(uri: DocumentUri) {
    return this.asts.get(uri);
  }

  parse(content: string, file: string) {
    const tokens = this.tokenizer.tokenize(content);
    return Markdoc.parse(tokens, file);
  }

  protected handleClose({ document }: TextChangeEvent) {
    this.asts.delete(document.uri);
  }

  protected handleChange({ document }: TextChangeEvent) {
    const content = this.parse(document.getText(), document.uri);
    this.asts.set(document.uri, content);
  }
}
