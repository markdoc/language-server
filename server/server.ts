import * as LSP from "vscode-languageserver/node";
import * as Services from "./services";
import * as Plugins from "./plugins";

import type {
  Config,
  DocumentMetadata,
  ServiceConstructors,
  PluginConstructors,
} from "./types";

export const defaultCapabilities: LSP.ServerCapabilities = {
  textDocumentSync: {
    save: true,
    openClose: true,
    change: LSP.TextDocumentSyncKind.Full,
  },
};

export function connect(
  connection: LSP.Connection,
  capabilities: LSP.ServerCapabilities
): Promise<any> {
  let options: any;

  connection.onInitialize((params) => {
    options = params.initializationOptions;
    return { capabilities };
  });

  return new Promise((resolve) => {
    connection.onInitialized(() => resolve(options));
    connection.listen();
  });
}

export async function server<
  TConfig extends Config = Config,
  TMeta extends DocumentMetadata = DocumentMetadata
>(
  serviceConstructors: ServiceConstructors<TConfig, TMeta> = Services,
  pluginConstructors: PluginConstructors = Plugins,
  capabilities: LSP.ServerCapabilities = defaultCapabilities
) {
  const connection = LSP.createConnection(LSP.ProposedFeatures.all);
  const options = await connect(connection, capabilities);
  const config = options.config as TConfig;

  connection.sendProgress(LSP.WorkDoneProgress.type, "initialize", {
    kind: "begin",
    title: "Initializing",
  });

  const services = Object.fromEntries(
    Object.entries(serviceConstructors).map(([name, service]) => [
      name,
      new service(config, connection),
    ])
  );

  const plugins = Object.values(pluginConstructors).map(
    (plugin) => new plugin(config, connection, services)
  );

  await Promise.allSettled(
    Object.values(services).map((service: any) => service.initialize?.())
  );

  const registration = LSP.BulkRegistration.create();
  for (const item of [...Object.values(services), ...plugins])
    item.register?.(registration);
  connection.client.register(registration);

  await Promise.allSettled(plugins.map((plugin) => plugin.initialize?.()));

  connection.sendProgress(LSP.WorkDoneProgress.type, "initialize", {
    kind: "end",
  });
}
