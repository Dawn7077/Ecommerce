import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores:[
      "public/**",
      '/controllers/admin/salesReportContoller2.js'
    ]
  },
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node },
  rules:{
    "no-unused-vars": "off"
  }

},
  
]);
