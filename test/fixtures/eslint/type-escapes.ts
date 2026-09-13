/* eslint-disable */
// Every construct below must be reported. The disable comment above has no
// effect because eslint.config.js sets linterOptions.noInlineConfig.

export const anyValue: any = 1;

export function describeValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const asserted = JSON.parse("1") as number;

export const angleBracket = <number>JSON.parse("1");

export const constAssertion = ["a"] as const;

const maybeHome: string | undefined = process.env["HOME"];
export const homeLength = maybeHome!.length;
