/**
 * Wraps `tools/linear-external-content.txt` as MCP-shaped JSON and writes
 * `tools/linear-external-get-document.json` for `materialize-linear-external.mjs`.
 */
import fs from "node:fs";

const content = fs.readFileSync("tools/linear-external-content.txt", "utf8");
const url =
  "https://linear.app/spectranoir/document/external-documentation-follow-up-prompts-245d4fbb4b10";
fs.writeFileSync(
  "tools/linear-external-get-document.json",
  JSON.stringify({ url, content }),
  "utf8",
);
console.log("wrote tools/linear-external-get-document.json", content.length);
