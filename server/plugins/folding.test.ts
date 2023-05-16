import * as Markdoc from "@markdoc/markdoc";
import * as assert from "node:assert";
import { test } from "node:test";
import FoldingProvider from "./folding";

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

const connectionMock = { onFoldingRanges(...args) {} };

test("folding provider", async (t) => {
  // @ts-expect-error
  const provider = new FoldingProvider({}, connectionMock, {});

  await t.test("simple example", () => {
    const ast = Markdoc.parse(example1);
    // @ts-expect-error
    const ranges = provider.ranges(ast);
    assert.equal(ranges.length, 1);
    assert.deepEqual(ranges, [{ startLine: 3, endLine: 5 }]);
  });

  await t.test("nested example", () => {
    const ast = Markdoc.parse(example2);
    // @ts-expect-error
    const ranges = provider.ranges(ast);
    assert.equal(ranges.length, 3);
    assert.deepEqual(ranges, [
      { startLine: 3, endLine: 13 },
      { startLine: 4, endLine: 10 },
      { startLine: 7, endLine: 9 },
    ]);
  });
});
