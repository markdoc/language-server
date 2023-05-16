import * as LSP from "vscode-languageclient/node";
import * as VSC from "vscode";
import * as utils from "./utils";
import Client, { ClientState } from "./client";

async function showServiceControls(client: Client) {
  const response = await VSC.window.showInformationMessage(
    "Markdoc Language Server",
    "Show Output",
    "Edit Configuration",
    client.state == ClientState.Disabled ? "Enable" : "Disable"
  );

  switch (response) {
    case "Edit Configuration":
      const config = utils.getConfigForWorkspace(client.root);
      VSC.commands.executeCommand("vscode.open", config);
      break;
    case "Show Output":
      client.showOutputChannel();
      break;
    case "Disable":
      client.disable();
      break;
    case "Enable":
      client.enable();
      break;
  }
}

function peekLocations(
  uri: string,
  position: LSP.Position,
  locations: LSP.Location[]
) {
  return VSC.commands.executeCommand(
    "editor.action.peekLocations",
    VSC.Uri.parse(uri),
    utils.convertPosition(position),
    locations.map(utils.convertLocation)
  );
}

export default function register() {
  return [
    VSC.commands.registerCommand("markdoc.peekLocations", peekLocations),
    VSC.commands.registerCommand(
      "markdoc.showServiceControls",
      showServiceControls
    ),
  ];
}
