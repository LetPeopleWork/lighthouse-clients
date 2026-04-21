export const renderMcpHttpBanner = (): string =>
  "Lighthouse MCP HTTP runtime skeleton";

export const runMcpHttpRuntime = (
  write: (message: string) => void = console.log,
): void => {
  write(renderMcpHttpBanner());
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runMcpHttpRuntime();
}
