import * as VSC from "vscode";
import { DependencyInfo, PartialReference } from "../server/types";

type PartialTreeRoot = { title: string; children?: PartialReference[] };
type PartialTreeItem = PartialTreeRoot | PartialReference;

export default class PartialTreeProvider
  implements VSC.TreeDataProvider<PartialTreeItem>
{
  private info?: DependencyInfo;
  private uri?: VSC.Uri;

  private updateEmitter = new VSC.EventEmitter<void>();
  readonly onDidChangeTreeData = this.updateEmitter.event;

  update(info: DependencyInfo | undefined, uri: VSC.Uri) {
    this.info = info;
    this.uri = uri;
    this.updateEmitter.fire();
  }

  getTreeItem(element: PartialTreeItem): VSC.TreeItem {
    if (!this.uri) return {};

    if ("title" in element) {
      const item = new VSC.TreeItem(element.title);
      item.collapsibleState =
        element?.children && element.children.length > 0
          ? VSC.TreeItemCollapsibleState.Expanded
          : VSC.TreeItemCollapsibleState.None;
      return item;
    }

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
    element?: PartialTreeItem
  ): VSC.ProviderResult<PartialTreeItem[]> {
    if (element) return element.children;
    if (!this.info) return [{ title: "Loading..." }];

    const rootElements = [];
    const { dependencies, dependents } = this.info;

    if (dependencies.length > 0)
      rootElements.push({ title: "Partials", children: dependencies });

    if (dependents.length > 0)
      rootElements.push({ title: "References", children: dependents });

    if (rootElements.length < 1) rootElements.push({ title: "None" });

    return rootElements;
  }
}
