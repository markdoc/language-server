import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";
import * as assert from "node:assert";
import { test } from "node:test";
import DefinitionProvider from "./definition";

type DefinitionCallback = (
  params: LSP.DefinitionParams
) => LSP.Definition | null;

type ReferenceCallback = (params: LSP.ReferenceParams) => LSP.Location[] | null;

class ConnectionMock {
  private referenceCallback?: ReferenceCallback;
  private definitionCallback?: DefinitionCallback;

  onDefinition(callback: DefinitionCallback) {
    this.definitionCallback = callback;
  }

  simulateDefinition(params: LSP.DefinitionParams) {
    return this.definitionCallback?.(params);
  }

  onReferences(callback: ReferenceCallback) {
    this.referenceCallback = callback;
  }

  simulateReference(params: LSP.ReferenceParams) {
    return this.referenceCallback?.(params);
  }
}

const example1 = `
# Example 1

{% partial file="foo.md" /%}

This is a test

{% partial file="bar.md" /%}
`;

const example2 = `
# Example 2

{% partial /%}
`;

test("definition provider", async (t) => {
  await t.test("find partial at line", async (t) => {
    const connection = new ConnectionMock();
    // @ts-expect-error
    const provider = new DefinitionProvider({}, connection, {});
    const ast = Markdoc.parse(example1);

    await t.test("simple example", () => {
      assert.strictEqual(provider.getPartialAtLine(ast, 3), "foo.md");
      assert.strictEqual(provider.getPartialAtLine(ast, 7), "bar.md");
    });

    await t.test("without a partial", () => {
      assert.strictEqual(provider.getPartialAtLine(ast, 5), undefined);
    });

    await t.test("with missing file attribute", () => {
      const ast = Markdoc.parse(example2);
      assert.strictEqual(provider.getPartialAtLine(ast, 3), undefined);
    });
  });
});
