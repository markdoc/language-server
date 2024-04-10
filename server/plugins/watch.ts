import * as LSP from "vscode-languageserver/node";
import pathutil from "path";

import type { FileWatchEvent, Config, ServiceInstances } from "../types";

export default class Watch {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    const content = pathutil.join(config.path, "**/*.{md,mdoc,markdoc}");
    services.Watcher.add(content, this.onContentChange.bind(this));

    if (config.schema?.watch && config.schema.path)
      services.Watcher.add(config.schema.path, this.onSchemaChange.bind(this));
  }

  initialize() {
    this.services.Watcher.watch();
  }

  onSchemaChange(changes: FileWatchEvent[]) {
    this.services.Schema.reload();
  }

  onContentChange(changes: FileWatchEvent[]) {
    for (const change of changes) {
      const path = pathutil.join(this.config.root, change.path);
      if (change.type === LSP.FileChangeType.Deleted)
        this.services.Scanner.delete(path);
      else this.services.Scanner.update(path);
    }
  }
}
