import * as LSP from "vscode-languageserver/node";
import { test } from "node:test";
import assert from "node:assert";
import Commands from "./commands";

type ExecuteCommandCallback = (params: LSP.ExecuteCommandParams) => void;

class ConnectionMock {
  private callback?: ExecuteCommandCallback;

  onExecuteCommand(callback: ExecuteCommandCallback) {
    this.callback = callback;
  }

  simulateCommand(params: LSP.ExecuteCommandParams) {
    this.callback?.(params);
  }
}

test("commands service", async (t) => {
  await t.test("sends command list during registration", (t) => {
    const connection = new ConnectionMock();
    // @ts-expect-error
    const commands = new Commands({}, connection);
    commands.add("foo", () => true);
    commands.add("bar", () => true);
    commands.add("baz", () => true);

    const registration = LSP.BulkRegistration.create();

    let items: string[] = [];
    const onRegister = (
      _type: any,
      params: LSP.ExecuteCommandRegistrationOptions
    ) => (items = params.commands);

    t.mock.method(registration, "add", onRegister);
    commands.register(registration);
    assert.deepEqual(items, ["foo", "bar", "baz"]);
  });

  await t.test("executes a command correctly", (t) => {
    const connection = new ConnectionMock();
    // @ts-expect-error
    const commands = new Commands({}, connection);

    let params: string[] = [];
    commands.add("foo.bar", (param1, param2) => (params = [param1, param2]));
    connection.simulateCommand({
      command: "foo.bar",
      arguments: ["baz", "qux"],
    });

    assert.deepEqual(params, ["baz", "qux"]);
  });

  await t.test("handles non-existent command", (t) => {
    const connection = new ConnectionMock();
    // @ts-expect-error
    const commands = new Commands({}, connection);

    let params: string[] = [];
    commands.add("foo.bar", (param1, param2) => (params = [param1, param2]));
    connection.simulateCommand({
      command: "zzzz",
      arguments: ["baz", "qux"],
    });

    assert.equal(params.length, 0);
  });
});
