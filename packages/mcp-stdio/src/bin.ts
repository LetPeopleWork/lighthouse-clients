import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runMcpStdioRuntime } from "./runtime.js";

export { runMcpStdioRuntime } from "./runtime.js";

const isDirectExecution = (): boolean => {
  const argvPath = process.argv[1];
  if (argvPath === undefined) {
    return false;
  }

  try {
    return fileURLToPath(import.meta.url) === realpathSync(argvPath);
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  process.exitCode = await runMcpStdioRuntime();
}
