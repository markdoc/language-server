import pathutil from "path";
import { promises as fs } from "fs";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as LSP from "vscode-languageserver/node";
import type * as Markdoc from "@markdoc/markdoc";

export async function* findFiles(
  target: string,
  exts?: string[]
): AsyncIterable<string> {
  const dir = await fs.readdir(target);

  for (const entry of dir) {
    const filename = pathutil.join(target, entry);
    const info = await fs.stat(filename);

    if (info.isDirectory()) yield* findFiles(filename, exts);
    else if (!exts || exts.includes(pathutil.extname(filename))) yield filename;
  }
}

export function toPlainText(node: Markdoc.Node): string {
  let output = "";
  for (const child of node.walk())
    if (child.type === "text")
      output += child.attributes.content;

  return output;
}

export function getContentRangeInLine(
  line: number,
  doc: TextDocument,
  text: string
) {
  if (typeof line !== "number" || line < 0) return null;
  const lineContent = doc.getText(LSP.Range.create(line, 0, line + 1, 0));
  const startOffset = lineContent.indexOf(text);
  const endOffset = startOffset + text.length;
  return startOffset < 0
    ? null
    : LSP.Range.create(line, startOffset, line, endOffset);
}

export function* getBlockRanges(ast: Markdoc.Node) {
  for (const { type, lines, tag } of ast.walk())
    if (type === "tag" && lines.length === 4)
      yield { start: lines[0], end: lines[2], tag };
}
