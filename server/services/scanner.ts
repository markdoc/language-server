import * as LSP from "vscode-languageserver/node";
import { promises as fs } from "fs";
import * as Markdoc from "@markdoc/markdoc";
import yaml from "yaml";
import pathutil from "path";
import { findFiles } from "../utils";

import type { DocumentMetadata, Config } from "../types";

export default class Scanner<
  TConfig extends Config = Config,
  TMeta extends DocumentMetadata = DocumentMetadata
> {
  protected tokenizer: Markdoc.Tokenizer;
  protected files = new Map<string, TMeta>();
  protected extensions = [".md", ".mdoc"];
  protected path: string;

  readonly routes = new Map<string, string>();
  readonly partials = new Set<string>();

  constructor(protected config: TConfig) {
    this.tokenizer = new Markdoc.Tokenizer(config.markdoc ?? {});
    this.path = pathutil.join(config.root, config.path);
  }

  initialize() {
    return this.scan();
  }

  has(file: string) {
    const path = this.relativePath(file);
    return this.files.has(path);
  }

  get(file: string) {
    const path = this.relativePath(file);
    return this.files.get(path);
  }

  delete(file: string) {
    const path = this.relativePath(file);

    if (this.config.routing) {
      const doc = this.files.get(path);
      if (doc?.route) this.routes.delete(doc.route);
      else this.partials.delete(path);
    }

    this.files.delete(path);
  }

  entries() {
    return this.files.entries();
  }

  fullPath(file: string): string {
    return file.startsWith(this.path)
      ? file
      : file.startsWith("/")
      ? file
      : pathutil.join(this.path, file);
  }

  relativePath(file: string): string {
    return file.startsWith(this.path) ? file.slice(this.path.length + 1) : file;
  }

  matches(file: string): boolean {
    return (
      file.startsWith(this.path) &&
      this.extensions.includes(pathutil.extname(file))
    );
  }

  parse(content: string, file: string) {
    const tokens = this.tokenizer.tokenize(content);
    return Markdoc.parse(tokens, file);
  }

  async scan() {
    const promises = [];
    const files = findFiles(this.path, this.extensions);
    for await (let file of files) promises.push(this.update(file));
    await Promise.allSettled(promises);
  }

  async update(file: string) {
    const content = await this.read(file);
    const ast = this.parse(content, file);
    const meta = this.extract(ast);
    const path = this.relativePath(file);

    if (this.config.routing) {
      if (meta.route) this.routes.set(meta.route, path);
      else this.partials.add(path);
    }

    this.files.set(path, meta);
  }

  async read(file: string): Promise<string> {
    const buffer = await fs.readFile(file);
    return buffer.toString();
  }

  frontmatter(content?: string) {
    if (!content) return {};

    try {
      return yaml.parse(content);
    } catch (err) {
      return {};
    }
  }

  extract(doc: Markdoc.Node): TMeta;
  extract(doc: Markdoc.Node): DocumentMetadata {
    const frontmatter = this.frontmatter(doc.attributes.frontmatter);

    const { routing } = this.config;
    const route = routing?.frontmatter && frontmatter[routing?.frontmatter];
    const partials: Markdoc.Node[] = [];
    const links: Markdoc.Node[] = [];

    for (const node of doc.walk())
      if (node.type === "tag" && node.tag === "partial") partials.push(node);
      else if (node.type === "link" && node.attributes?.href.startsWith("/"))
        links.push(node);

    return { frontmatter, partials, links, route };
  }
}
