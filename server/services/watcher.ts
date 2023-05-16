import * as LSP from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import pathutil from "path";
import picomatch from "picomatch";
import type { FileWatchEvent, Config } from "../types";

type WatcherCallback = (events: FileWatchEvent[]) => void;

type Matcher = {
  pattern: LSP.Pattern;
  matcher?: picomatch.Matcher;
  callback?: WatcherCallback;
};

export default class Watcher<TConfig extends Config = Config> {
  private disposable?: LSP.Disposable;
  private matchers: Matcher[] = [];

  constructor(protected config: TConfig, protected connection: LSP.Connection) {
    connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));
  }

  protected onDidChangeWatchedFiles(params: LSP.DidChangeWatchedFilesParams) {
    const changes = params.changes.map(({ uri, type }) => ({
      path: URI.parse(uri).fsPath.slice(this.config.root.length + 1),
      type,
    }));

    for (const { matcher, callback } of this.matchers) {
      if (!matcher || !callback) continue;
      const filtered = changes.filter((change) => matcher(change.path));
      if (filtered.length) callback(filtered);
    }
  }

  add(pattern: LSP.Pattern, callback?: WatcherCallback) {
    this.matchers.push({
      matcher: picomatch(pattern),
      pattern,
      callback,
    });
  }

  async watch() {
    if (this.disposable) this.disposable.dispose();

    const watchers: LSP.FileSystemWatcher[] = this.matchers.map(
      ({ pattern }) => ({
        globPattern: pathutil.join(this.config.root, pattern),
      })
    );

    this.disposable = await this.connection.client.register(
      LSP.DidChangeWatchedFilesNotification.type,
      { watchers }
    );
  }
}
