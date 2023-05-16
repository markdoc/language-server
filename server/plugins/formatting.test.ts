import * as LSP from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { test } from "node:test";
import assert from "node:assert";
import FormattingProvider from "./formatting";

const example1 = `
# This is a test {% id="foo" %}

* This is an example [foo](/bar)
`;

const example1Formatted = `
# This is a test {% #foo %}

- This is an example [foo](/bar)
`;

const example1LastLine = `
- This is an example [foo](/bar)
`;

const mockConnection = {
  onDocumentFormatting(...params) {},
  onDocumentRangeFormatting(...params) {},
};

function mockDoc(content: string) {
  return TextDocument.create("file:///content.md", "markdown", 0, content);
}

test("formatting provider", async (t) => {
  // @ts-expect-error
  const provider = new FormattingProvider({}, mockConnection, {});

  await t.test("simple full-text formatting", () => {
    const doc = mockDoc(example1);
    // @ts-expect-error
    const [output] = provider.formatRange(doc);
    assert.strictEqual(output.newText.trim(), example1Formatted.trim());
  });

  await t.test("formatting a specific line", () => {
    const doc = mockDoc(example1);
    const [output] = provider.formatRange(doc, LSP.Range.create(3, 0, 4, 0));
    assert.strictEqual(output.newText.trim(), example1LastLine.trim());
  });
});
