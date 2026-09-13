import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// AGENTS.md bans these escape hatches out of the type system. The generic
// no-restricted-syntax selectors also catch forms that the dedicated rules
// allow, such as `as const`.
const bannedTypeEscapes = [
  {
    selector: "TSAnyKeyword",
    message: "`any` is banned. Model the type or parse the value with zod.",
  },
  {
    selector: "TSUnknownKeyword",
    message: "`unknown` is banned. Model the type or parse the value with zod.",
  },
  {
    selector: "TSAsExpression",
    message: "Type assertions (`as`) are banned. Use a type guard, `satisfies` or a zod schema.",
  },
  {
    selector: "TSTypeAssertion",
    message: "Angle-bracket type assertions are banned. Use a type guard, `satisfies` or a zod schema.",
  },
  {
    selector: "TSNonNullExpression",
    message: "Non-null assertions (`!`) are banned. Narrow the value instead.",
  },
];

export default defineConfig(
  globalIgnores(["node_modules/", "coverage/", "plugin/dist/", "adapters/", "test/fixtures/eslint/"]),
  {
    // Inline eslint-disable comments would let code opt out of the bans.
    linterOptions: { noInlineConfig: true },
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-syntax": ["error", ...bannedTypeEscapes],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true, "ts-check": false },
      ],
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
