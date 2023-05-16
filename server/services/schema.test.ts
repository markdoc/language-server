import * as pathutil from "node:path";
import * as assert from "node:assert";
import { test } from "node:test";
import Schema from "./schema";
import type { Config } from "../types";

const root = pathutil.join(__dirname, "../test");

test("schema service", async (t) => {
  await test("loads ESM schema", async (t) => {
    await test("with default export", async (t) => {
      const config = {
        root,
        schema: { path: "schemas/example-1.mjs", type: "esm" },
      };

      const schema = new Schema(config as Config);
      await schema.reload();

      assert.strictEqual(schema.get()?.tags.foo.render, "foo");
    });

    await test("with keyed export", async (t) => {
      const config = {
        root,
        schema: { path: "schemas/example-2.mjs", type: "esm", property: "foo" },
      };

      const schema = new Schema(config as Config);
      await schema.reload();
      assert.strictEqual(schema.get()?.tags.foo.render, "foo");
    });
  });

  await test("loads CJS schema", async (t) => {
    await test("with default export", async (t) => {
      const config = {
        root,
        schema: { path: "schemas/example-1.js", type: "node" },
      };

      const schema = new Schema(config as Config);
      await schema.reload();

      assert.strictEqual(schema.get()?.tags.foo.render, "foo");
    });

    await test("with keyed export", async (t) => {
      const config = {
        root,
        schema: { path: "schemas/example-2.mjs", type: "esm", property: "foo" },
      };

      const schema = new Schema(config as Config);
      await schema.reload();
      assert.strictEqual(schema.get()?.tags.foo.render, "foo");
    });
  });
});
