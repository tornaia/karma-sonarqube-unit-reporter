# karma-sonarqube-unit-reporter

[![npm version](https://img.shields.io/npm/v/karma-sonarqube-unit-reporter.svg)](https://www.npmjs.com/package/karma-sonarqube-unit-reporter)
[![npm downloads](https://img.shields.io/npm/dt/karma-sonarqube-unit-reporter.svg)](https://www.npmjs.com/package/karma-sonarqube-unit-reporter)
[![CI](https://github.com/tornaia/karma-sonarqube-unit-reporter/actions/workflows/ci.yml/badge.svg)](https://github.com/tornaia/karma-sonarqube-unit-reporter/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/karma-sonarqube-unit-reporter.svg)](https://opensource.org/licenses/MIT)

A [Karma](https://karma-runner.github.io/) reporter that writes test results in the
[SonarQube generic test execution format](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/test-coverage/generic-test-data/),
so SonarQube can show the number, duration and outcome of your JavaScript / TypeScript unit tests.

- Works with Jasmine, Mocha and QUnit through Karma.
- Maps each test to its source file, which is what SonarQube needs to attach results to files.
- Handles several browsers and [karma-parallel](https://github.com/joeljeske/karma-parallel) shards.
- No runtime dependencies.

## Installation

```sh
npm install --save-dev karma-sonarqube-unit-reporter
```

Requires Node.js 14 or newer and Karma (any version from 0.9 on, tested with 6.x).

## Usage

Add the reporter to your `karma.conf.js`:

```js
module.exports = function (config) {
  config.set({
    // ...
    reporters: ['progress', 'sonarqubeUnit'],

    sonarQubeUnitReporter: {
      outputFile: 'reports/ut_report.xml',
      useBrowserName: false,
      overrideTestDescription: true,
      testPaths: ['./src'],
      testFilePattern: '.spec.ts',
    },
  })
}
```

Karma loads every installed `karma-*` package automatically. If your configuration lists `plugins` explicitly, add
`'karma-sonarqube-unit-reporter'` to it.

Then point SonarQube to the report in `sonar-project.properties`:

```properties
sonar.tests=src
sonar.test.inclusions=**/*.spec.ts
sonar.testExecutionReportPaths=reports/ut_report.xml
```

The report looks like this:

```xml
<testExecutions version="1">
  <file path="src/app/app.component.spec.ts">
    <testCase name="AppComponent should create the app" duration="17"/>
    <testCase name="AppComponent should render the title" duration="4">
      <failure message="Expected 'Hello' to contain 'Hi'.">Expected 'Hello' to contain 'Hi'.
    at UserContext.&lt;anonymous&gt; (src/app/app.component.spec.ts:24:33)
</failure>
    </testCase>
    <testCase name="AppComponent is pending" duration="1">
      <skipped message="Skipped"/>
    </testCase>
  </file>
</testExecutions>
```

## How the file path of a test is found

SonarQube only accepts results for files it knows, so the `path` attribute must be the test file, relative to the
directory the scanner runs in (or absolute). Karma itself does not tell reporters which file a spec came from, which
is why this reporter offers three ways to fill the attribute:

1. **`overrideTestDescription: true`** (recommended). The reporter scans `testPaths` for files matching
   `testFilePattern`, reads the names of the `describe(...)` blocks in them, and looks up the top-level `describe` of
   every spec in that map. Since `describe` names are matched literally, only string literals are recognised; a suite
   whose name is computed at runtime cannot be mapped.
2. **`filenameFormatter`**. A function `(path, result) => string` that receives the path determined so far (the mapped
   file when `overrideTestDescription` is on, otherwise the description-based path) and Karma's spec result, and
   returns the path to write.
3. **The default**. Without either option the top-level `describe` name is used as the path, prefixed with the
   browser name (`useBrowserName`) and the `suite` option. This is the historical behaviour, and it only produces
   usable paths when your `describe` names are file paths.

When a `describe` cannot be found in any scanned file, the description-based path is written for it and a warning
names the description, the scanned paths and the pattern, so the rest of the report stays intact.

## Options

All options live under `sonarQubeUnitReporter` in the Karma configuration.

| Option                    | Default                                                                   | Description                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outputDir`               | `'.'`                                                                     | Directory for the report, relative to Karma's `basePath`.                                                                                                                                                                           |
| `outputFile`              | none                                                                      | File name (may contain directories) inside `outputDir`. Without it the file is `ut_report-<browser>.xml`, or `ut_report.xml` when `useBrowserName` is `false`.                                                                      |
| `useBrowserName`          | `true`                                                                    | Write one report per browser, named after it (`outputFile` goes into a sub directory named after the browser), and prefix description-based paths with the browser name. Set to `false` for a single report.                        |
| `overrideTestDescription` | `false`                                                                   | Map each spec to its test file, see above.                                                                                                                                                                                          |
| `testPaths`               | `['./']`                                                                  | Directories (or files) to scan for test files, relative to the working directory. An entry that does not exist there is looked up relative to Karma's `basePath`. A single string is accepted too (`testPath` is a legacy alias).   |
| `testFilePattern`         | `/\.spec\.[jt]sx?$/`                                                      | Which files to scan. A `RegExp`, a string, or an array of both. A string matches the end of the path, `*` matches within one path segment, `**` across segments, `/` matches either separator. Example: `['.spec.js', '.spec.ts']`. |
| `describeFunctions`       | `['describe', 'fdescribe', 'xdescribe', 'ddescribe', 'context', 'suite']` | Functions whose first string argument names a suite. For QUnit use `['module']`.                                                                                                                                                    |
| `prependTestFileName`     | `''`                                                                      | Prefix for mapped file paths, for example the project directory in a monorepo (`'apps/portal'` or `__dirname`).                                                                                                                     |
| `filenameFormatter`       | none                                                                      | `(path, result) => string`, see above. Returning a falsy value keeps the input.                                                                                                                                                     |
| `testnameFormatter`       | none                                                                      | `(name, result) => string` to change the test case name, which defaults to the `describe` names followed by the `it` description.                                                                                                   |
| `suite`                   | `''`                                                                      | Prefix (followed by `/`) for description-based paths.                                                                                                                                                                               |
| `sonarQubeVersion`        | `'LATEST'`                                                                | `'5.x'` writes the `unitTest` root element expected by SonarQube versions before 6.2; anything else writes `testExecutions`.                                                                                                        |

## Several browsers and karma-parallel

Reports are written when the run completes. Browsers whose results go to the same file are merged:

- With `useBrowserName: true` (the default) every browser name gets its own file, and the shards karma-parallel starts
  for one browser are combined into that file.
- With `useBrowserName: false` all browsers end up in the single report, so a test executed in two browsers appears
  twice under its file.

## Monorepos

SonarQube resolves paths relative to `sonar.projectBaseDir`, usually the repository root, while Karma is often
started inside one project. Two options help:

- `prependTestFileName: 'apps/portal'` prefixes every mapped path.
- `testPaths` entries that do not exist relative to the working directory are resolved against Karma's `basePath`,
  so `testPaths: ['./src']` keeps working when `ng test portal` runs from the repository root.

## Logging

Warnings are logged for `testPaths` entries that do not exist, `describe` names that were not found in any test
file, and reports that could not be written. Run Karma with `logLevel: config.LOG_DEBUG` to see how every path and
test name was transformed and where the report was written.

## Development

```sh
npm install
npm test          # eslint + prettier check + jasmine
node test/smoke.js  # dependency-free check of the reporter, also run on old Node versions in CI
```

See [CHANGELOG.md](CHANGELOG.md) for the release history.

## Credits

Started in 2016 as a fork of [karma-junit-reporter](https://github.com/karma-runner/karma-junit-reporter) to
address [karma-junit-reporter#81](https://github.com/karma-runner/karma-junit-reporter/issues/81). Thanks to everyone
who contributed fixes and ideas through issues and pull requests.

## License

[MIT](LICENSE)
