import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/interpolation-reconciliation-demo.ts',
  output: {
    name: 'bundle',
    file: 'build.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve(),
    typescript({
      sourceMap: true
    }),
  ]
}