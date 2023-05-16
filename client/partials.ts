import * as VSC from "vscode";
import { DependencyInfo, PartialReference } from "../server/types";

export default class PartialTreeProvider
  implements VSC.TreeDataProvider<PartialReference>
{
  private info?: DependencyInfo;
  private uri?: VSC.Uri;

  private updateEmitter = new VSC.EventEmitter<void>();
  readonly onDidChangeTreeData = this.updateEmitter.event;

  update(info: DependencyInfo, uri: VSC.Uri) {
    this.info = info;
    this.uri = uri;
    this.updateEmitter.fire();
  }

  getTreeItem(element: PartialReference): VSC.TreeItem {
    if (!this.uri) return {};
    const uri = VSC.Uri.joinPath(this.uri, element.file);
    const item = new VSC.TreeItem(element.file);
    item.command = { command: "vscode.open", title: "Open", arguments: [uri] };
    item.resourceUri = uri;
    item.collapsibleState =
      element?.children && element.children.length > 0
        ? VSC.TreeItemCollapsibleState.Collapsed
        : VSC.TreeItemCollapsibleState.None;

    return item;
  }

  getChildren(
    element?: PartialReference
  ): VSC.ProviderResult<PartialReference[]> {
    return element
      ? element.children
      : !this.info
      ? null
      : this.info.dependents.length > 0
      ? this.info.dependents
      : this.info.dependencies;
  }
}
