import typescript from 'rollup-plugin-ts';
import ttypescript from 'ttypescript'

export default {
  input: 'src/index.ts',
  output: {
    file: 'lib/index.js',
    format: 'cjs'
  },
  plugins: [
    typescript({
      typescript: ttypescript,
      tsconfig: resolvedConfig => ({
        ...resolvedConfig,
        declaration: true,
        plugins: [
          {
            "transform": "@zerollup/ts-transform-paths",
            "exclude": ["*"]
          }
        ]
      }),
    }),
  ],
  external: ['axios', 'lodash', '@lomray/microservice-nodejs-lib', 'class-validator', 'class-validator-jsonschema', 'traverse'],
};
