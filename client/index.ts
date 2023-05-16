import * as VSC from "vscode";
import Extension from "./extension";

let extension: Extension;

export function activate(context: VSC.ExtensionContext) {
  extension = new Extension(context);
  extension.start();
}

export function deactivate() {
  extension.deactivate();
}
