module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '.'],
  setupFiles: ['core-js'],
  roots: [
    './test',
  ],
  globals: {
    'ts-jest': {
      tsConfig: "tsconfig.json",
      astTransformers: ['ts-nameof']
    },
  },
};
