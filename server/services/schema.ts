import * as pathutil from "path";
import type * as Markdoc from "@markdoc/markdoc";
import type { Config } from "../types";

export default class Schema<TConfig extends Config = Config> {
  protected schema?: Markdoc.Config;

  constructor(protected config: TConfig) {}

  get(): Markdoc.Config | undefined {
    return this.schema;
  }

  initialize() {
    return this.reload();
  }

  async reload() {
    this.schema = await this.load();
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
