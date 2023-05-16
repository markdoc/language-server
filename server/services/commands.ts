import * as LSP from "vscode-languageserver/node";
import type { Config } from "../types";

type Callback = (...args: any) => any;

export default class Commands<TConfig extends Config = Config> {
  protected commands = new Map<string, Callback>();

  constructor(protected config: TConfig, protected connection: LSP.Connection) {
    connection.onExecuteCommand(this.onCommand.bind(this));
  }

  add(name: string, callback: Callback) {
    this.commands.set(name, callback);
  }

  register(registration: LSP.BulkRegistration) {
    registration.add(LSP.ExecuteCommandRequest.type, {
      commands: Array.from(this.commands.keys()),
    });
  }

  protected onCommand({ command, arguments: args }: LSP.ExecuteCommandParams) {
    this.commands.get(command)?.(...(args ?? []));
  }
}
