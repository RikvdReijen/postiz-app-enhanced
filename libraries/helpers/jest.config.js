/**
 * Standalone on purpose: the root jest config builds its project list through
 * @nx/jest, which is not installed, so `pnpm test` cannot currently run
 * anything. Rather than take on fixing that here, this config stands alone and
 * is run by `pnpm run test:helpers`.
 */
module.exports = {
  displayName: 'helpers',
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^@gitroom/helpers/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
