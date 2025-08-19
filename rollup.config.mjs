import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";

export default [
  // ESM build
  {
    input: "src/index.ts",
    external: ["react", "react-dom"],
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
        rootDir: "src",
      }),
      babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
    ],
  },
  // CommonJS build
  {
    input: "src/index.ts",
    external: ["react", "react-dom"],
    output: {
      file: "dist/index.js",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
      }),
      babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
    ],
  },
];
