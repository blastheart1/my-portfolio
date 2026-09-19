import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated reports. `npm run test:coverage` writes an HTML report here,
      // and linting a coverage reporter's own bundled JavaScript reports
      // problems nobody can act on — and did, the moment CI started running
      // the two commands in sequence.
      "coverage/**",
      "playwright-report/**",
    ],
  },
  {
    // The setup scripts are plain CommonJS run by `node scripts/x.js`, not
    // application code. `require()` is correct there; the app-wide ban on it
    // is about the bundled TypeScript.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
