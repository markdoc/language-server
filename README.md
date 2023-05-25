# `@markdoc/language-server`

This is the official Visual Studio Code extension and language server for the [Markdoc](https://markdoc.dev/) authoring framework.

When the language server and extension are used together and configured to load a Markdoc schema, they support the following features:

- Syntax highlighting for Markdoc tags inside of Markdown content
- Autocompletion of Markdoc tags and attribute values declared in the schema
- Autocompletion of links based on routes declared in document frontmatter
- Clicking through partial tags and document links to open the corresponding file
- "Peeking" at the underlying file for a partial tag inside of a document
- Identifying all of the references to a partial to show where it is used
- Code folding for content ranges within block-level Markdoc tags
- Formatting ranges and whole documents using Markdoc's built-in formatter
- Validating the document against the user's schema and displaying inline error indicators
- Displaying error messages for malformed Markdoc tag syntax and structural errors like unmatched opening and closing tags
- Creating new Markdoc files from user-defined templates via the new file menu
- Linked editing for matched opening and closing tag names

## Configuration quickstart

After installing the Markdoc extension in Visual Studio Code, create a Markdoc language server configuration file. The extension looks for a file called `markdoc.config.json` in your workspace root, but you can customize this in the extension's settings.

The JSON configuration file consists of an array of server instance descriptions. The following example demonstrates how to create a basic Markdoc language server configuration:

```json
[
  {
    "id": "my-site",
    "path": "docs/content",
    "schema": {
      "path": "docs/dist/schema.js",
      "type": "node",
      "property": "default",
      "watch": true
    },
    "routing": {
      "frontmatter": "route"
    }
  }
]
```

- The `id` property is a string that uniquely identifies the server configuration. In Visual Studio Code, the extension displays this in the status bar when a file from the configuration has focus
- The `path` property is a string that contains the path to the base directory where your Markdoc content is stored, relative to your workspace root directory
- The `schema` property is an object that describes the location of your [Markdoc schema](https://markdoc.dev/docs/config) and how to load it from the filesystem
  - The `path` property is string that contains the path to the schema module, relative to the workspace root directory
  - The `type` property is a string that must be either `"node"` or `"esm"`. This property indicates whether the schema module uses node's `module.exports` convention or the standards-based ECMAScript modules `export` syntax
  - The `property` property is the name of the property exported by the module that contains the schema.
    - When this property is omitted and the type is set to `"node"`, the extension automatically assumes that the schema itself is the top-level value of `module.exports`.
    - When the property is omitted and the type is set to `"esm"`, the extension automatically assumes the schema itself is the default export (e.g. `export default {}`)
  - The `watch` property is a boolean value that, when set to `true`, configures the extension to monitor the schema file for changes and reload it automatically
  - The `routing` property is an optional object that describes your project's routing configuration
    - The `frontmatter` property is a string that tells the extension which property in the Markdoc file's YAML frontmatter contains the URL route associated with the file

It is possible to have multiple Markdoc configurations for the same workspace by adding additional configuration objects to the top-level array. This is useful in cases where you have multiple websites with different schemas under different subdirectories of the same workspace. For example, you might want separate configurations for narrative documentation and an API reference.

In [multi-root workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces), a Markdoc configuration file is specific to an individual workspace root. You can have separate Markdoc configuration files for each root. If you need to override the location of the Markdoc language server configuration file in a multi-root workspace, you can use a [folder setting](https://code.visualstudio.com/docs/editor/multi-root-workspaces#_settings) to customize this behavior per root.

## Building from source

```
$ npm install
$ (cd server && npm install) && (cd client && npm install)
$ npm run build
$ npm run build:types
$ npm run build:extension
```

## Running unit tests

The test suite relies on the 'node:test' module that is only included in Node.js 18.x or higher.

```
$ npm run test
```

## License

This project uses the [MIT license](LICENSE).
