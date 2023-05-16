import * as VSC from "vscode";
import Client, { ClientState } from "./client";

export default class StatusItem implements VSC.Disposable {
  protected item: VSC.StatusBarItem;
  protected listener?: VSC.Disposable;
  protected client?: Client;

  constructor() {
    this.item = VSC.window.createStatusBarItem(VSC.StatusBarAlignment.Left);
    this.item.text = "Initializing";
  }

  setClient(client: Client) {
    this.listener?.dispose();
    this.client = client;
    this.listener = this.client.onStateDidChange(() => this.update());
    this.update();
  }

  private update() {
    if (!this.client) return;

    const { id, state } = this.client;
    const text = `Markdoc: ${id}`;

    this.item.text =
      state == ClientState.Initializing
        ? `$(loading~spin) ${text}`
        : state == ClientState.Disabled
        ? `${text} (Disabled)`
        : text;

    this.item.command = {
      command: "markdoc.showServiceControls",
      title: "Show Service Controls",
      arguments: [this.client],
    };

    this.item.show();
  }

  dispose() {
    this.item.dispose();
  }
}
