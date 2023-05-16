import pathutil from "path";
import { promises as fs } from "fs";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as LSP from "vscode-languageserver/node";

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

export function getContentRangeInLine(
  line: number,
  doc: TextDocument,
  text: string
) {
  const lineContent = doc.getText(LSP.Range.create(line, 0, line + 1, 0));
  const startOffset = lineContent.indexOf(text);
  const endOffset = startOffset + text.length;
  return LSP.Range.create(line, startOffset, line, endOffset);
}
