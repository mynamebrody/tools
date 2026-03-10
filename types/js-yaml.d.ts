declare module "js-yaml" {
  export function load(input: string): unknown;
  export function dump(input: unknown, options?: {
    indent?: number;
    sortKeys?: boolean;
    noRefs?: boolean;
    lineWidth?: number;
    flowLevel?: number;
    condenseFlow?: boolean;
  }): string;

  const yaml: {
    load: typeof load;
    dump: typeof dump;
  };

  export default yaml;
}
