import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';

export default {
  input: 'demo/src/interpolation-reconciliation-demo.ts',
  output: {
    name: 'bundle',
    file: 'demo/build.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    typescript({
      sourceMap: true
    }),
    builtins(),
    resolve()
  ]
}