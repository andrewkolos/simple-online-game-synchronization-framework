module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '.'],
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
