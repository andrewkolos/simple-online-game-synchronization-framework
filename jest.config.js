module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '.'],
  roots: [
    './test',
  ],
  globals: {
    'ts-jest': {
      astTransformers: ['ts-nameof']
    },
  },
};
