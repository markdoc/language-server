import * as VSC from "vscode";

export default class Preview implements VSC.Disposable {
  protected panel?: VSC.WebviewPanel;

  exists() {
    return !!this.panel;
  }

  display() {
    if (this.panel) return this.panel.reveal();

    this.panel = VSC.window.createWebviewPanel(
      "markdoc.preview",
      "Markdoc Preview",
      VSC.ViewColumn.Beside,
      { enableScripts: true }
    );

    this.panel.onDidDispose(() => (this.panel = undefined));
  }

  update(content: string) {
    if (!this.panel) return;
    this.panel.webview.html = content;
  }

  dispose() {
    this.panel?.dispose();
  }
}
