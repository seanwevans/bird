import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist", "playwright-report", "test-results"] },
  eslint.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        CustomEvent: "readonly",
        document: "readonly",
        clearTimeout: "readonly",
        KeyboardEvent: "readonly",
        navigator: "readonly",
        process: "readonly",
        requestAnimationFrame: "readonly",
        window: "readonly",
      },
    },
  },
  prettier,
];
