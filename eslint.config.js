import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    rules: { "no-console": "error" },
  },
  // vendored scripts are byte-exact copies; don't lint or reformat them
  { ignores: ["dist/**", ".astro/**", "public/pagefind/**", "public/js/**"] },
];
