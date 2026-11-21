import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "cypress/**",
      "cypress.config.ts",
      "**/__test__/**/*",
    ],
  },
  ...nextCoreWebVitals,
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  testingLibrary.configs["flat/react"],
  jestDom.configs["flat/recommended"],
];

export default config;
