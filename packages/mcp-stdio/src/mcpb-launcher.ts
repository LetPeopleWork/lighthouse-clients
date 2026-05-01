import { runMcpStdioRuntime } from "./runtime.js";

runMcpStdioRuntime().then((code) => {
  process.exitCode = code;
});
