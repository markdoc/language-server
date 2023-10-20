import * as VSC from "vscode";
import Client, { ClientState, TemplatePickerItem } from "./client";
import PartialTreeProvider from "./partials";
import StatusItem from "./status";
import Preview from "./preview";
import commands from "./commands";
import * as utils from "./utils";
import type { Config } from "../server/types";

export default class Extension {
  private watchers: VSC.FileSystemWatcher[] = [];
  private clients: Client[] = [];
  private partials: PartialTreeProvider;
  private status: StatusItem;
  private preview: Preview;

  constructor(private context: VSC.ExtensionContext) {
    this.partials = new PartialTreeProvider();
    this.status = new StatusItem();
    this.preview = new Preview();

    context.subscriptions.push(
      ...commands(),
      this.status,
      this.preview,
      VSC.commands.registerCommand(
        "markdoc.extractPartial",
        this.onExtractPartial.bind(this)
      ),
      VSC.commands.registerCommand(
        "markdoc.newFileFromTemplate",
        this.onNewFileFromTemplate.bind(this)
      ),
      VSC.commands.registerCommand(
        "markdoc.preview",
        this.onPreview.bind(this)
      ),
      VSC.workspace.onDidChangeConfiguration(this.onConfigChange.bind(this)),
      VSC.workspace.onDidChangeWorkspaceFolders(this.onFolderChange.bind(this)),
      VSC.workspace.onDidSaveTextDocument(this.onSave.bind(this)),
      VSC.window.onDidChangeActiveTextEditor(this.onActive.bind(this)),
      VSC.window.registerTreeDataProvider("markdocPartials", this.partials)
    );
  }

  async parse(uri: VSC.Uri) {
    try {
      const raw = await VSC.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(raw);
      return JSON.parse(text);
    } catch (err) {
      console.log("Failed to parse Markdoc config:", err);
      return;
    }
  }

  async start() {
    const clientsToStart = [];
    VSC.commands.executeCommand("setContext", "markdoc.enabled", true);
    for (const root of VSC.workspace.workspaceFolders ?? []) {
      const configUri = utils.getConfigForWorkspace(root);
      const config: Config[] = await this.parse(configUri);

      if (!config) continue;

      this.addRestartWatcher(configUri.fsPath);
      const openUris = VSC.window.visibleTextEditors.map((e) => e.document.uri);

      for (const entry of config) {
        const client = new Client(root, entry, this.context);
        this.clients.push(client);

        if (entry.server?.path && entry.server.watch) {
          const { path, watch } = entry.server;
          const match = typeof watch === "string" ? watch : path;
          const pattern = new VSC.RelativePattern(root, match);
          this.addRestartWatcher(pattern);
        }

        const contentPath = VSC.Uri.joinPath(root.uri, entry.path);
        if (openUris.find((uri) => uri.fsPath.startsWith(contentPath.fsPath)))
          clientsToStart.push(client);
      }
    }

    if (clientsToStart.length < 1) return;
    this.status.setClient(clientsToStart[0]);
    await Promise.allSettled(clientsToStart.map((client) => client.start()));
  }

  async restart() {
    await this.stop();
    return this.start();
  }

  async stop() {
    VSC.commands.executeCommand("setContext", "markdoc.enabled", false);
    await Promise.allSettled(this.clients.map((client) => client.stop()));
    this.watchers.forEach((watcher) => watcher.dispose());
    this.clients.forEach((client) => client.dispose());
    this.clients = [];
    this.watchers = [];
  }

  deactivate() {
    return this.stop();
  }

  addRestartWatcher(pattern: VSC.GlobPattern) {
    const watcher = VSC.workspace.createFileSystemWatcher(pattern);
    watcher.onDidChange(this.restart.bind(this));
    this.watchers.push(watcher);
  }

  findClient(uri: VSC.Uri): Client | undefined {
    return this.clients.find((client) =>
      uri.fsPath.startsWith(client.uri.fsPath)
    );
  }

  setActive(client?: Client) {
    VSC.commands.executeCommand("setContext", "markdoc.active", !!client);
    VSC.commands.executeCommand(
      "setContext",
      "markdoc.canPreview",
      client?.canPreview()
    );

    if (client) this.status.setClient(client);
  }

  async onActive(editor?: VSC.TextEditor) {
    if (!editor) return;
    if (editor.document.languageId !== "markdoc") return this.setActive();

    const { uri } = editor.document;
    const client = this.findClient(uri);
    this.setActive(client);

    if (!client) return;
    await client.start();

    const output = await client.getDependencies(uri);
    if (output) this.partials.update(output, client.uri);
    this.updatePreview(client, uri);
  }

  async onNewFileFromTemplate() {
    const validStates = [ClientState.Running, ClientState.Initializing];
    const options: TemplatePickerItem[] = [];

    for (const client of this.clients) {
      if (!validStates.includes(client.state)) continue;

      const templates = client.getTemplates();
      const separator = {
        label: client.id,
        kind: VSC.QuickPickItemKind.Separator,
      };

      if (templates) options.push(separator, ...templates);
    }

    const selected = await VSC.window.showQuickPick(options, {
      title: "Select a Markdoc template",
    });

    if (!selected?.uri) return;

    const raw = await VSC.workspace.fs.readFile(selected.uri);
    const content = new TextDecoder().decode(raw);
    const doc = await VSC.workspace.openTextDocument({
      content,
      language: "markdoc",
    });

    VSC.window.showTextDocument(doc);
  }

  async onExtractPartial() {
    const editor = VSC.window.activeTextEditor;
    if (!editor) return;

    const uri = await VSC.window.showSaveDialog({
      saveLabel: 'Create',
      title: 'Name the new partial',
      filters: {'Markdoc': ['md', 'mdoc', 'markdoc', 'markdoc.md']}
    });

    if (!uri) return;

    const client = this.findClient(uri);
    if (!client) return;

    const path = uri.fsPath.slice(client.uri.fsPath.length + 1);
    const partialTag = `{% partial file="${path}" /%}`;

    const edit = new VSC.WorkspaceEdit();
    const contents = new TextEncoder().encode(editor.document.getText(editor.selection));
    edit.createFile(uri, {overwrite: true, contents});
    edit.replace(editor.document.uri, editor.selection, partialTag);
    VSC.workspace.applyEdit(edit);
  }

  async onPreview(previewUri: VSC.Uri) {
    const uri = previewUri ?? VSC.window.activeTextEditor?.document.uri;
    if (!uri) return;

    const client = this.findClient(uri);
    if (!client?.canPreview()) return;

    this.preview.display();
    this.updatePreview(client, uri);
  }

  async updatePreview(client: Client, uri: VSC.Uri) {
    if (this.preview.exists() && client.canPreview()) {
      const assetUri = this.preview.getAssetUri(client.root.uri); 
      const content = await client.renderPreview(uri, assetUri);
      if (content) this.preview.update(content);
    }
  }

  onSave(doc: VSC.TextDocument) {
    if (doc.languageId !== 'markdoc') return;
    const client = this.findClient(doc.uri);
    if (client) this.updatePreview(client, doc.uri);
  }

  onConfigChange(ev: VSC.ConfigurationChangeEvent) {
    if (ev.affectsConfiguration("markdoc.config.path")) this.restart();
  }

  onFolderChange(ev: VSC.WorkspaceFoldersChangeEvent) {
    this.restart();
  }
}
