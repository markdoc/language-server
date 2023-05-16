import * as LSP from "vscode-languageclient/node";
import * as VSC from "vscode";

export function convertPosition(position: LSP.Position): VSC.Position {
  return new VSC.Position(position.line, position.character);
}

export function convertLocation(location: LSP.Location): VSC.Location {
  const uri = VSC.Uri.parse(location.uri);
  const start = convertPosition(location.range.start);
  const end = convertPosition(location.range.end);
  return new VSC.Location(uri, new VSC.Range(start, end));
}

export function getConfigForWorkspace(root: VSC.WorkspaceFolder): VSC.Uri {
  const settings = VSC.workspace.getConfiguration("markdoc", root);
  const path = settings.get<string>("config.path", "markdoc.config.json");
  return VSC.Uri.joinPath(root.uri, path);
}
