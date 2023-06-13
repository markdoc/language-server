import * as LSP from "vscode-languageserver/node";
import * as Markdoc from "@markdoc/markdoc";
import * as assert from "node:assert";
import { test } from "node:test";
import SelectionRangeProvider from "./range";

const example1 = `
# Example 1

{% foo %}
test
{% /foo %}
`;

const example2 = `
# Example 2

{% foo %}
{% bar %}
test

{% baz %}
test
{% /baz %}
{% /bar %}

test
{% /foo %}
`;

const connectionMock = { onSelectionRanges(...args) {} };

test("folding provider", async (t) => {
  // @ts-expect-error
  const provider = new SelectionRangeProvider({}, connectionMock, {});

  await t.test("simple example", () => {
    const ast = Markdoc.parse(example1);
    const range = provider.findSelectionRange(ast, LSP.Position.create(4, 3));
    assert.deepEqual(range, {
      parent: {
        parent: undefined,
        range: {
          start: { line: 3, character: 0 },
          end: { line: 6, character: 0 },
        },
      },
      range: {
        start: { line: 4, character: 0 },
        end: { line: 5, character: 0 },
      },
    });
  });

  await t.test("nested example", () => {
    const ast = Markdoc.parse(example2);
    const range = provider.findSelectionRange(ast, LSP.Position.create(8, 3));
    const expected = {
      parent: {
        parent: {
          parent: {
            parent: {
              parent: {
                parent: undefined,
                range: {
                  start: { line: 3, character: 0 },
                  end: { line: 14, character: 0 },
                },
              },
              range: {
                start: { line: 4, character: 0 },
                end: { line: 13, character: 0 },
              },
            },
            range: {
              start: { line: 4, character: 0 },
              end: { line: 11, character: 0 },
            },
          },
          range: {
            start: { line: 5, character: 0 },
            end: { line: 10, character: 0 },
          },
        },
        range: {
          start: { line: 7, character: 0 },
          end: { line: 10, character: 0 },
        },
      },
      range: {
        start: { line: 8, character: 0 },
        end: { line: 9, character: 0 },
      },
    };

    assert.deepEqual(range, expected);
  });
});
