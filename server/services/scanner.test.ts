import * as LSP from "vscode-languageserver/node";
import * as assert from "node:assert";
import pathutil from "node:path";
import { test } from "node:test";
import Scanner from "./scanner";
import type { Config } from "../types";

test("scanner service", async (t) => {
  await t.test("utility functions", async (t) => {
    const config = {
      root: "/root/directory",
      path: "docs/content",
    };

    const scanner = new Scanner(config as Config);

    await t.test("fullPath", async (t) => {
      const fullPath = "/root/directory/docs/content/foo/bar/baz.md";

      await t.test("with relative path", () => {
        assert.strictEqual(scanner.fullPath("foo/bar/baz.md"), fullPath);
      });

      await t.test("with already full path", () => {
        assert.strictEqual(scanner.fullPath(fullPath), fullPath);
      });

      await t.test("with unrelated path", () => {
        assert.strictEqual(
          scanner.fullPath("/foo/bar/baz.md"),
          "/foo/bar/baz.md"
        );
      });
    });

    await t.test("relativePath", async (t) => {
      const fullPath = "/root/directory/docs/content/foo/bar/baz.md";
      const relative = "foo/bar/baz.md";

      await t.test("with relative path", () => {
        assert.strictEqual(scanner.relativePath(relative), relative);
      });

      await t.test("with already full path", () => {
        assert.strictEqual(scanner.relativePath(fullPath), relative);
      });

      await t.test("with unrelated path", () => {
        assert.strictEqual(
          scanner.relativePath("/foo/bar/baz.md"),
          "/foo/bar/baz.md"
        );
      });
    });

    await t.test("matches", async (t) => {
      await t.test("does match", () => {
        assert.strictEqual(
          scanner.matches("/root/directory/docs/content/a/b/c.md"),
          true
        );
      });

      await t.test("does not match", async (t) => {
        assert.strictEqual(scanner.matches("foo/bar/baz.md"), false);
        assert.strictEqual(
          scanner.matches("/root/directory/foo/bar.md"),
          false
        );

        await t.test("wrong extension", () => {
          assert.strictEqual(
            scanner.matches("/root/directory/docs/content/foo.zzz"),
            false
          );
        });
      });
    });
  });

  await t.test("scanning", async (t) => {
    const root = pathutil.join(__dirname, "../test");
    const config = { root, path: "content", routing: { frontmatter: "route" } };
    const scanner = new Scanner(config as Config);
    await scanner.initialize();

    await t.test("finds all of the files", () => {
      // @ts-expect-error
      assert.strictEqual(scanner.files.size, 3);
      assert.deepEqual(
        // @ts-expect-error
        Array.from(scanner.files.keys()).toSorted(),
        ["partials/part.md", "file-1.md", "file-2.md"].toSorted()
      );
    });

    await t.test("has function", async (t) => {
      await t.test("finds present files", async (t) => {
        assert.strictEqual(scanner.has("partials/part.md"), true);
        assert.strictEqual(scanner.has("file-2.md"), true);
        assert.strictEqual(scanner.has("partials/part.md"), true);

        await t.test("with full path", () => {
          assert.strictEqual(
            scanner.has(pathutil.join(root, "content/partials/part.md")),
            true
          );
        });
      });

      await t.test("doesn't find non-existent files", () => {
        assert.strictEqual(scanner.has("foo/bar/baz.md"), false);
      });
    });

    await t.test("get function", async (t) => {
      const file = scanner.get("file-1.md");
      assert.strictEqual(file?.route, "/docs/file-1");

      await t.test("handles missing files", () => {
        assert.strictEqual(scanner.get("foo.md"), undefined);
      });
    });

    await t.test("file removal", async (t) => {
      const scanner = new Scanner(config as Config);
      await scanner.initialize();

      // @ts-expect-error
      assert.strictEqual(scanner.files.size, 3);
      assert.strictEqual(scanner.routes.size, 2);
      scanner.delete("file-2.md");

      // @ts-expect-error
      assert.strictEqual(scanner.files.size, 2);
      assert.strictEqual(scanner.routes.size, 1);
      assert.deepEqual(Array.from(scanner.routes.keys()), ["/docs/file-1"]);
    });

    await t.test("extraction", async (t) => {
      await t.test("routing", async (t) => {
        const basicConfig = { root, path: "content" };
        await t.test("identifies routes", async (t) => {
          assert.strictEqual(scanner.get("file-1.md")?.route, "/docs/file-1");
          assert.strictEqual(scanner.get("file-2.md")?.route, "/docs/file-2");
          assert.strictEqual(scanner.get("partials/part.md")?.route, undefined);
        });

        await t.test("without routing config", async (t) => {
          const scanner = new Scanner(basicConfig as Config);
          await scanner.initialize();
          assert.strictEqual(scanner.get("file-1.md")?.route, undefined);
        });

        await t.test("with alternate routing config", async (t) => {
          const config = { ...basicConfig, routing: { frontmatter: "foo" } };
          const scanner = new Scanner(config as Config);
          await scanner.initialize();
          assert.strictEqual(scanner.get("file-1.md")?.route, "/docs/foo");
        });
      });

      await t.test("identifies links", async (t) => {
        const { links } = scanner.get("file-1.md");
        assert.strictEqual(links.length, 1);
        assert.strictEqual(links[0].attributes.href, "/docs/file-2");
      });

      await t.test("identifies partials", async (t) => {
        const { partials } = scanner.get("file-2.md");
        assert.strictEqual(partials.length, 1);
        assert.strictEqual(partials[0].attributes.file, "partials/part.md");
      });

      await t.test("doesn't put route on partial", () => {
        const part = scanner.get("partials/part.md");
        assert.strictEqual(part?.route, undefined);
      });

      await t.test("adds partials to set", async (t) => {
        assert.strictEqual(scanner.partials.size, 1);
        assert.deepEqual(Array.from(scanner.partials), ["partials/part.md"]);
      });
    });
  });
});
