import * as LSP from "vscode-languageserver/node";
import * as pathutil from "path";
import * as Markdoc from "@markdoc/markdoc";
import type { Config } from "../types";

export default class Schema<TConfig extends Config = Config> {
  protected schema?: Markdoc.Config;

  constructor(protected config: TConfig) {}

  get(uri?: LSP.URI): Markdoc.Config | undefined {
    return this.schema;
  }

  initialize() {
    return this.reload();
  }

  async reload() {
    const schema = await this.load();
    this.schema = schema && this.merge(schema);
  }

  merge(config: Markdoc.Config) {
    return {
      ...config,
      tags: {
        ...Markdoc.tags,
        ...config.tags,
      },
      nodes: {
        ...Markdoc.nodes,
        ...config.nodes,
      },
      functions: {
        ...Markdoc.functions,
        ...config.functions,
      },
    };
  }

  async load(): Promise<Markdoc.Config | undefined> {
    const { schema, root } = this.config;
    if (!schema) return;

    const absolute = pathutil.join(root, schema.path);
    if (schema.type === "node") {
      delete require.cache[absolute];
      const value = require(absolute);
      return schema.property ? value[schema.property] : value;
    }

    const value = await import(`${absolute}?${Date.now()}`);
    return value[schema.property ?? "default"];
  }
}
