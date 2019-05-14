import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'demo/src/interpolation-reconciliation-demo.ts',
  output: {
    name: 'bundle',
    file: 'demo/build.js',
    format: 'iife'
  },
  plugins: [
    typescript(),
    resolve()
  ]
}