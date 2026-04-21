export const renderCliBanner = (): string => "Lighthouse CLI skeleton";

export const runCli = (
  write: (message: string) => void = console.log,
): void => {
  write(renderCliBanner());
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
