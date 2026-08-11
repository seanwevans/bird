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
        CANNON: "readonly",
        CustomEvent: "readonly",
        document: "readonly",
        navigator: "readonly",
        process: "readonly",
        requestAnimationFrame: "readonly",
        THREE: "readonly",
        window: "readonly",
      },
    },
  },
  prettier,
];
