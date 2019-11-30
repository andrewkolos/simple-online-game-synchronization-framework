import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es'
    }
  ],
  plugins: [
    resolve({
      extensions: ['.js', '.ts']
    }),
    commonjs(),
    typescript({
      sourceMap: true,
      declaration: true,
    }),
  ]
} 