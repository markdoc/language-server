import type { Node } from "@markdoc/markdoc";
import type * as LSP from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type * as DefaultServices from "./services";

export type TextChangeEvent = LSP.TextDocumentChangeEvent<TextDocument>;

export type ServiceConstructor<TConfig extends Config = Config> = new (
  config: TConfig,
  connection: LSP.Connection
) => any;

export type ServiceConstructors<
  TConfig extends Config = Config,
  TMeta extends DocumentMetadata = DocumentMetadata
> = {
  Commands: typeof DefaultServices.Commands<TConfig>;
  Documents: typeof DefaultServices.Documents<TConfig>;
  Schema: typeof DefaultServices.Schema<TConfig>;
  Watcher: typeof DefaultServices.Watcher<TConfig>;
  Scanner: typeof DefaultServices.Scanner<TConfig, TMeta>;
  [name: string]: ServiceConstructor<TConfig>;
};

export type ServiceInstances<
  TServices extends ServiceConstructors<
    TConfig,
    TMeta
  > = typeof DefaultServices,
  TConfig extends Config = Config,
  TMeta extends DocumentMetadata = DocumentMetadata
> = {
  [Name in keyof TServices]: InstanceType<TServices[Name]>;
};

export type PluginConstructor = new (
  config: any,
  connection: LSP.Connection,
  services: any
) => any;

export type PluginConstructors = Record<string, PluginConstructor>;

export type SchemaConfig = {
  path: string;
  type?: "node" | "esm";
  property?: string;
  watch?: boolean;
};

export type MarkdocConfig = {
  slots?: boolean;
  typographer?: boolean;
  allowIndentation?: boolean;
  allowComments?: boolean;
  validateFunctions?: boolean;
};

export type RoutingConfig = {
  frontmatter: string;
};

export type ServerConfig = {
  path: string;
  watch: boolean | string;
};

export type TemplateConfig = {
  pattern?: string;
};

export type Config = {
  id?: string;
  root: string;
  path: string;
  markdoc?: MarkdocConfig;
  schema?: SchemaConfig;
  routing?: RoutingConfig;
  server?: ServerConfig;
  templates?: TemplateConfig;
  preview?: boolean;
  watch?: string[];
};

export type PartialReference = {
  file: string;
  line: number;
  children?: PartialReference[];
};

export type DependencyInfo = {
  dependencies: PartialReference[];
  dependents: PartialReference[];
};

export type DocumentMetadata = {
  frontmatter: Record<string, any>;
  partials: Node[];
  links?: Node[];
  route?: string;
};

export type FileWatchEvent = {
  path: string;
  type: LSP.FileChangeType;
};
