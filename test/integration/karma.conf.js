'use strict'

// Karma configuration for the integration test (see run.js): a real Karma
// server, real karma-jasmine and a headless Chrome, with the reporter loaded
// from the repository root. basePath is the repository root, so the paths
// below and the ones in the report are relative to it; run.js also starts
// Karma from there.

module.exports = function (config) {
  config.set({
    basePath: '../..',
    frameworks: ['jasmine'],
    files: ['test/integration/fixtures/**/*.spec.js'],
    reporters: ['sonarqubeUnit'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      // --no-sandbox is required on Linux CI runners where Chrome runs as root
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox'] },
    },
    singleRun: true,
    autoWatch: false,
    colors: false,
    logLevel: config.LOG_WARN,
    plugins: ['karma-jasmine', 'karma-chrome-launcher', require('../../index.js')],

    sonarQubeUnitReporter: {
      outputDir: 'test/integration/output',
      outputFile: 'ut_report.xml',
      useBrowserName: false,
      overrideTestDescription: true,
      testPaths: ['test/integration/fixtures'],
      testFilePattern: '.spec.js',
    },
  })
}
