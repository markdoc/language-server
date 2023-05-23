import * as VSC from "vscode";
import * as LSP from "vscode-languageclient/node";
import pathutil from "path";

import type { DependencyInfo, Config } from "../server/types";

type WorkProgress =
  | LSP.WorkDoneProgressBegin
  | LSP.WorkDoneProgressReport
  | LSP.WorkDoneProgressEnd;

export type TemplatePickerItem = VSC.QuickPickItem & { uri?: VSC.Uri };

export enum ClientState {
  NotStarted,
  Initializing,
  Running,
  Stopped,
  Disabled,
}

export default class MarkdocClient implements VSC.Disposable {
  private readonly stateDidChange = new VSC.EventEmitter<ClientState>();
  private readonly disposables: VSC.Disposable[] = [];
  private templates?: VSC.Uri[];
  private client?: LSP.LanguageClient;
  #state = ClientState.NotStarted;

  readonly onStateDidChange = this.stateDidChange.event;
  readonly id: string;
  readonly uri: VSC.Uri;

  constructor(
    readonly root: VSC.WorkspaceFolder,
    private config: Omit<Config, "root">,
    private context: VSC.ExtensionContext
  ) {
    this.id = config.id ?? "MarkdocLanguageServer";
    this.uri = VSC.Uri.joinPath(root.uri, config.path);
  }

  get state() {
    return this.#state;
  }

  protected set state(value: ClientState) {
    this.#state = value;
    this.stateDidChange.fire(value);
  }

  disable() {
    this.state = ClientState.Disabled;
    return this.stop();
  }

  enable() {
    this.state = ClientState.Stopped;
    return this.start();
  }

  start(): Promise<void> | undefined {
    if ([ClientState.NotStarted, ClientState.Stopped].includes(this.state))
      return new Promise((resolve) => this.createClient(resolve));
  }

  stop() {
    this.dispose();
    return this.client?.stop();
  }

  canPreview() {
    return this.state == ClientState.Running && this.config.preview;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }

  showOutputChannel() {
    this.client?.outputChannel.show();
  }

  private options() {
    const { scheme, fsPath } = this.root.uri;
    const config = { root: fsPath, ...this.config };
    const module = config.server?.path
      ? pathutil.join(fsPath, config.server?.path)
      : this.context.asAbsolutePath("dist/client/server.js");

    const run: LSP.NodeModule = { module, transport: LSP.TransportKind.ipc };
    const server: LSP.ServerOptions = {
      run,
      debug: { ...run, options: { execArgv: ["--nolazy", "--inspect=6009"] } },
    };

    const pattern = pathutil.join(fsPath, config.path, "**/*.{md,mdoc}");
    const client: LSP.LanguageClientOptions = {
      initializationOptions: { config },
      documentSelector: [{ language: "markdown", scheme, pattern }],
      markdown: { isTrusted: true },
    };

    return { server, client };
  }

  private async createClient(resolve: () => void) {
    const { server, client } = this.options();
    const name = `Markdoc: ${this.id}`;

    this.client = new LSP.LanguageClient(this.id, name, server, client);
    this.disposables.push(this.client.start());
    this.state = ClientState.Initializing;
    await this.client.onReady();

    const onWorkProgress = ({ kind }: WorkProgress) => {
      if (kind !== "end") return;
      this.state = ClientState.Running;
      resolve();
    };

    if (this.config?.templates?.pattern)
      VSC.workspace
        .findFiles(this.config.templates.pattern)
        .then((result) => (this.templates = result));

    this.disposables.push(
      this.client.onProgress(
        LSP.WorkDoneProgress.type,
        "initialize",
        onWorkProgress
      )
    );
  }

  getTemplates(): TemplatePickerItem[] | void {
    if (!this.templates) return;
    return this.templates.map((uri) => ({
      uri,
      label: pathutil.basename(uri.fsPath),
      detail: uri.fsPath.slice(this.root.uri.fsPath.length + 1),
    }));
  }

  async renderPreview(uri: VSC.Uri): Promise<string | void> {
    if (!this.client || this.state != ClientState.Running) return;
    return this.client.sendRequest("markdoc.renderPreview", uri.toString());
  }

  async getDependencies(uri: VSC.Uri): Promise<DependencyInfo | void> {
    if (!this.client || this.state != ClientState.Running) return;
    const file = uri.fsPath.slice(this.uri.fsPath.length + 1);
    return this.client.sendRequest("markdoc.getDependencies", file);
  }
}
