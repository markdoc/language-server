import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";
import type { Config, ServiceInstances } from "../types";

type ResolveFn = (item: LSP.CompletionItem) => LSP.CompletionItem;

type Completion = {
  match: RegExp;
  complete: (
    params: LSP.CompletionParams,
    matches: RegExpMatchArray,
    text: string
  ) => LSP.CompletionItem[];
};

export default class CompletionProvider {
  protected completions: Completion[] = [
    {
      match: /\{%[ ]*[^ ]+$/,
      complete: (params, matches, text) => {
        const schema = this.services.Schema.get();
        if (!schema?.tags) return [];

        const block = text.trim() === matches[0];
        return Object.keys(schema.tags).map((label) => ({
          data: { resolve: "tag", block },
          label,
        }));
      },
    },

    {
      match: /.*\{%[ ]*([a-zA-Z-_]+)[^\}]* ([a-zA-Z-_]+)="?[^ ]+$/,
      complete: (params, matches) => {
        const [tagName, attrName] = matches.slice(1);
        const schema = this.services.Schema.get();
        const attr = schema?.tags?.[tagName]?.attributes?.[attrName];

        if (!attr?.matches) return [];

        let accepts: Markdoc.SchemaMatches =
          typeof attr.matches === "function"
            ? attr.matches(schema ?? {})
            : attr.matches;

        if (!Array.isArray(accepts)) return [];

        const completions: LSP.CompletionItem[] = [];
        for (const option of accepts) {
          if (typeof option === "object") continue;
          completions.push({ label: `${option}` });
        }

        return completions;
      },
    },

    {
      match: /(?<!!)\[[^\]]*\]\(\/[^)]*$/,
      complete: (params) => {
        const routes = this.services.Scanner.routes.keys();
        return Array.from(routes).map((label) => ({
          insertText: label.slice(1),
          label,
        }));
      },
    },
  ];

  protected resolvers: Record<string, ResolveFn> = {
    tag: (item) => {
      const schema = this.services.Schema.get();
      const config = schema?.tags?.[item.label];

      if (!config) return item;

      const attrs = Object.entries(config.attributes ?? {});
      const required = attrs.filter(([_, { required }]) => required);

      let index = 1;
      let attrText = required
        .map(([name]) => ` ${name}=\${${index++}}`)
        .join("");

      if (required.length < attrs.length) attrText += `\${${index++}}`;

      const text = config.selfClosing
        ? `${item.label}${attrText} /%}`
        : `${item.label}${attrText} %}\n\$0\n{% /${item.label} %}`;

      return {
        ...item,
        insertText: item.data.block ? text : text.replaceAll("\n", ""),
        insertTextFormat: LSP.InsertTextFormat.Snippet,
        kind: LSP.CompletionItemKind.Function,
        documentation: config.description ?? "",
      };
    },
  };

  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onCompletion(this.onCompletion.bind(this));
    connection.onCompletionResolve(this.onCompletionResolve.bind(this));
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.CompletionRequest.type, {
      documentSelector: null,
      resolveProvider: true,
      triggerCharacters: [],
    });
  }

  protected onCompletion(params: LSP.CompletionParams): LSP.CompletionItem[] {
    const doc = this.services.Documents.get(params.textDocument.uri);
    if (!doc) return [];

    const {
      position: { line, character },
    } = params;

    const range = LSP.Range.create(line, 0, line, character);
    const text = doc.getText(range);

    for (const completion of this.completions) {
      const matches = text.match(completion.match);
      if (matches) return completion.complete?.(params, matches, text) ?? [];
    }

    return [];
  }

  protected onCompletionResolve(item: LSP.CompletionItem): LSP.CompletionItem {
    if (!item.data?.resolve) return item;
    return this.resolvers[item.data.resolve]?.(item) ?? item;
  }
}
