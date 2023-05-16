import * as LSP from "vscode-languageserver/node";
import * as assert from "node:assert";
import { test } from "node:test";
import Watcher from "./watcher";

type WatchedFilesCallback = (params: LSP.DidChangeWatchedFilesParams) => void;

class ConnectionMock {
  private callback?: WatchedFilesCallback;

  onDidChangeWatchedFiles(callback: WatchedFilesCallback) {
    this.callback = callback;
  }

  simulateEvent(params: LSP.DidChangeWatchedFilesParams) {
    this.callback?.(params);
  }
}

const config = {
  root: "/root",
  path: "docs/content",
};

test("watcher service", async (t) => {
  const connection = new ConnectionMock();

  await test("adding watches", () => {
    // @ts-expect-error
    const watcher = new Watcher(config, connection);
    watcher.add("foo/bar");
    watcher.add("baz/qux");

    // @ts-expect-error
    assert.equal(watcher.matchers.length, 2);
    // @ts-expect-error
    assert.equal(watcher.matchers[0].pattern, "foo/bar");
  });

  await test("glob matches", (t) => {
    let triggered = false;

    // @ts-expect-error
    const watcher = new Watcher(config, connection);
    watcher.add("foo/bar/*.md", () => (triggered = true));

    connection.simulateEvent({
      changes: [
        {
          type: LSP.WatchKind.Change,
          uri: "file:///root/foo/bar/baz.md",
        },
      ],
    });

    assert.equal(triggered, true);
  });
});
