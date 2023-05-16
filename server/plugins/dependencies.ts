import * as LSP from "vscode-languageserver/node";
import type {
  DependencyInfo,
  PartialReference,
  Config,
  ServiceInstances,
} from "../types";

export default class DependenciesProvider {
  constructor(
    protected config: Config,
    protected connection: LSP.Connection,
    protected services: ServiceInstances
  ) {
    connection.onRequest(
      "markdoc.getDependencies",
      this.onGetDependencies.bind(this)
    );
  }

  onGetDependencies(file: string): DependencyInfo {
    return {
      dependencies: this.dependencies(file),
      dependents: this.dependents(file),
    };
  }

  dependents(file: string): PartialReference[] {
    const output: PartialReference[] = [];
    for (const [key, { partials }] of this.services.Scanner.entries()) {
      const partial = partials.find((p) => p.attributes.file === file);
      if (partial) output.push({ file: key, line: partial.lines[0] });
    }

    return output;
  }

  dependencies(file: string): PartialReference[] {
    const { partials = [] } = this.services.Scanner.get(file) ?? {};
    return partials.map(({ attributes: { file }, lines: [line] }) => ({
      file,
      line,
      children: this.dependencies(file),
    }));
  }
}
