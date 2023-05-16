import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";
import { test } from "node:test";
import assert from "node:assert";
import Documents from "./documents";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Config } from "../types";

class DocumentsMock extends Documents {
  constructor() {
    const connectionProxy = {
      get(target: object, prop: string, receiver: object) {
        return () => LSP.Disposable.create(() => true);
      },
    };

    const connection = new Proxy({}, connectionProxy);
    super({} as Config, connection as LSP.Connection);
  }
}

const createDoc = (filename: string, content: string) =>
  TextDocument.create(filename, "markdown", 0, content);

test("documents service", async (t) => {
  await t.test("change handler", async (t) => {
    const docs = new DocumentsMock();
    const sample1 = createDoc("foo.md", "# Title\nThis is a test");
    const sample2 = createDoc("bar.md", "# Title\nThis is another test");

    // @ts-expect-error
    docs.handleChange({ document: sample1 });
    // @ts-expect-error
    docs.handleChange({ document: sample2 });

    await t.test("adds entries to the asts map", () => {
      // @ts-expect-error
      const keys = new Set(docs.asts.keys());
      assert.deepEqual(keys, new Set(["foo.md", "bar.md"]));
    });

    await t.test("parses documents", () => {
      const sample = docs.ast("foo.md");
      assert(sample);
      assert.equal(sample.type, "document");
      assert.equal(sample.children.length, 2);
    });
  });

  await t.test("close handler", async (t) => {
    const docs = new DocumentsMock();
    const sample1 = createDoc("foo.md", "# Title\nThis is a test");
    const sample2 = createDoc("bar.md", "# Title\nThis is another test");

    // @ts-expect-error
    docs.handleChange({ document: sample1 });
    // @ts-expect-error
    docs.handleChange({ document: sample2 });

    // @ts-expect-error
    docs.handleClose({ document: sample1 });

    await t.test("removes ast entries", () => {
      // @ts-expect-error
      assert.equal(docs.asts.size, 1);
      assert.equal(docs.ast("foo.md"), undefined);
    });
  });
});
