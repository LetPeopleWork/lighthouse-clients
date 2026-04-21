export type CliPackageContract = {
  readonly name: "@lighthouse/cli";
  readonly dependsOn: "@lighthouse/client";
  readonly runtime: "command-line";
};

export const getCliPackageContract = (): CliPackageContract => ({
  name: "@lighthouse/cli",
  dependsOn: "@lighthouse/client",
  runtime: "command-line",
});
