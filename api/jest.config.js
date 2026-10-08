/** Unit tests: pure logic, no database or network. */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
};
