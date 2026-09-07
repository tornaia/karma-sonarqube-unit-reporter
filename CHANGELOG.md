# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Entries before 1.0.0 were reconstructed from the git history and the
pull requests that were merged for each release.

## [Unreleased]

### Added

- Integration test that runs the fixtures through a real Karma 6 server with karma-jasmine and headless Chrome
  (`npm run test:integration`), executed in CI on Linux and Windows.

## [1.0.0] - 2026-09-07

The first stable release. Existing configurations keep working; see "Upgrading" below for the few visible
differences.

### Fixed

- Crashes in the middle of a test run: `Cannot read property 'children' of undefined`, `Cannot set property of null`
  and `Cannot read property 'value' of undefined`. They were caused by reading the XML built so far back on every
  spec and by resetting the state to `null` between runs. Results are now kept in a plain in-memory model. ([#72],
  [#53], [#28], [#67], [#49], [#34])
- `overrideTestDescription` never found a file when `useBrowserName` was left at its default of `true` or when the
  `suite` option was set, because the browser name or suite prefix was part of the lookup key. The top-level
  `describe` name alone selects the file now. ([#34], [#49])
- A `describe` that is not found in any scanned file (for example the synthetic suites added by karma-parallel) no
  longer breaks the report; the description is used as the path and one warning per name explains what was searched.
  ([#64], [#67])
- ANSI color codes in failure output (from karma-jasmine-diff-reporter and similar) made the XML serializer throw;
  they are stripped, as are characters that XML 1.0 does not allow. ([#51], [#52])
- karma-parallel shards, and several browsers with `useBrowserName: false`, overwrote each other's report; results
  that go to the same file are merged. ([#37])
- A custom `filenameFormatter` was ignored when `overrideTestDescription` was on; it now runs on the mapped file
  path. ([#29], [#46])
- `prependTestFileName` produced a double slash when given with a trailing slash and mixed separators when given a
  Windows path such as `__dirname`. ([#44])
- `duration` is a positive integer, as the SonarQube schema requires; fractional values failed the import.
- The `describe` parser broke on `describe (` with a space, on a line break after the parenthesis and on escaped
  quotes, ignored `describe.only`, `context` and `suite`, and could loop forever on unfinished input. ([#23], [#59])
- A `testPaths` entry that does not exist crashed Karma at start-up; it is reported with a warning now.
- `node_modules` was only skipped at the top level of the scanned directory; it and directories starting with a dot
  (`.git`, `.angular`, ...) are skipped at any depth.
- Messages from the file scanner went to `console.log`; they use Karma's logger. ([#24], [#45], [#48])
- Describe names that are `Object.prototype` properties (`constructor`) could produce bogus mappings.
- A spec without any surrounding `describe`, or a result without a `suite` or `log` array, produced the string
  `undefined` in the report or a crash.

### Added

- `describeFunctions` option to recognise other suite functions, e.g. `['module']` for QUnit. ([#59])
- `testFilePattern` accepts an array of strings and regular expressions. ([#32], [#35])
- `testPaths` entries that do not exist relative to the working directory are resolved against Karma's `basePath`,
  which makes `ng test <project>` in a monorepo work without extra configuration. ([#30])
- In watch mode the describe map is rebuilt (at most once per run) when an unknown `describe` shows up, so new spec
  files are mapped without restarting Karma.
- The failure element's `message` attribute carries the assertion message (the first line of the failure log)
  instead of the constant `Error`.
- Reporter, XML writer and parser test suites; a dependency-free smoke test run on Node 14, 16 and 18.
- GitHub Actions CI on Linux and Windows with Node 20, 22 and 24, replacing the Travis configuration.

### Changed

- Reports are written when the run completes instead of when each browser completes, and the test cases of a file
  are grouped into a single `<file>` element instead of a new element every time the specs switch files.
- The default `testFilePattern` is `/\.spec\.[jt]sx?$/` (anchored to the end of the file name) instead of
  `/(\.spec\.ts|\.spec.js)/`, which also matched `.spec.js.map` files.
- Test files are only scanned when `overrideTestDescription` is on.
- The package has no runtime dependencies any more; `xmlbuilder` was replaced by a small serializer that produces
  the same output. ([#36])
- `engines.node` is `>= 14`; the development toolchain (jasmine 7, eslint 10, prettier 3) needs Node 20.19 or newer.
- The `helper` service is no longer injected by Karma's DI (`$inject`).

### Removed

- The grunt build, the unused grunt release tasks and the Travis CI configuration.

### Upgrading from 0.0.23

The XML for an existing, working configuration is the same as before with these exceptions: test cases of one
file are grouped into one `<file>` element, `duration` values are rounded to integers, the failure `message`
attribute contains the assertion message, and a `describe` that cannot be mapped is written with its description as
the path instead of crashing. If you relied on `useBrowserName: false` only to work around the mapping crash, the
option is no longer required for `overrideTestDescription`, but it is still the right choice for a single report.

## [0.0.23] - 2020-10-23

- `testFilePattern` accepts `*` and `**` wildcards and regular expressions; a warning is logged when no file is found
  for a description. ([#55])

## [0.0.22] - 2020-10-23

- `prependTestFileName` option to prefix mapped paths, for projects living in a sub directory. ([#57], [#24])

## [0.0.21] - 2019-08-29

- Restore the Karma peer dependency range to `>=0.9`; 0.0.19 had narrowed it to `^0.9`. ([#41], [#42])

## [0.0.20] - 2019-08-29

- Fix the `describe` lookup for `describe ('name')` written with a space. ([#33])

## [0.0.19] - 2019-08-18

- Update dependencies with known vulnerabilities, update `xmlbuilder`, add Prettier and update ESLint. ([#36], [#38],
  [#39])

## [0.0.18] - 2018-08-07

- Match test files by suffix only and do not traverse `node_modules`. ([#27])

## [0.0.17] - 2018-06-09

- Revert the `suite` / `describe.only` support from 0.0.16, which broke the description lookup. ([#26])

## [0.0.16] - 2018-06-09

- Recognise `suite(` and `describe.only(` in test files. ([#25])

## [0.0.15] - 2018-03-18

- `testPaths` option to scan several directories; fix Windows paths with a single backslash. ([#21])

## [0.0.14] - 2017-11-12

- Document `useBrowserName` in the sample configuration. ([#22])

## [0.0.13] - 2017-08-13

- README fixes, more npm keywords. ([#18], [#20])

## [0.0.12] - 2017-07-19

- `overrideTestDescription`, `testPath` and `testFilePattern` options: map `describe` names to test files so the
  report contains real paths; platform independent paths; first jasmine tests. ([#17], [#2], [#14])

## [0.0.11] - 2017-02-04

- `sonarQubeVersion` option; `'5.x'` keeps writing the old `unitTest` root element. ([#16])

## [0.0.10] - 2017-01-21

- Write the `testExecutions` root element required by SonarQube 6.2.

## [0.0.9] - 2017-01-21

- Use `/` instead of `.` after the `suite` prefix so it can act as a folder. ([#15])

## [0.0.8] - 2016-08-03

- Test case names include the full `describe` path to avoid duplicates. ([#11], [#12])

## [0.0.7] - 2016-07-14

- Quieter logging. ([#10])

## [0.0.6] - 2016-07-13

- Durations are at least 1 ms, as SonarQube requires. ([#9])

## [0.0.5] - 2016-04-19

- `filenameFormatter` and `testnameFormatter` options receive the Karma result as second argument. ([#7])

## [0.0.4] - 2016-04-10

- Name formatter option. ([#6])

## [0.0.3] - 2016-02-09

- `failure` and `skipped` elements. ([#3])

## [0.0.2] - 2016-01-27

- Fix "Cannot supply flags when constructing one RegExp from another". ([#1])

## [0.0.1] - 2016-01-26

- First release, based on karma-junit-reporter.

[unreleased]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/1.0.0...HEAD
[1.0.0]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.23...1.0.0
[0.0.23]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.22...0.0.23
[0.0.22]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.21...0.0.22
[0.0.21]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.20...0.0.21
[0.0.20]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.19...0.0.20
[0.0.19]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.18...0.0.19
[0.0.18]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.17...0.0.18
[0.0.17]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.16...0.0.17
[0.0.16]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.15...0.0.16
[0.0.15]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.14...0.0.15
[0.0.14]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.13...0.0.14
[0.0.13]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.12...0.0.13
[0.0.12]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.11...0.0.12
[0.0.11]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.10...0.0.11
[0.0.10]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.9...0.0.10
[0.0.9]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.8...0.0.9
[0.0.8]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.7...0.0.8
[0.0.7]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.6...0.0.7
[0.0.6]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.5...0.0.6
[0.0.5]: https://github.com/tornaia/karma-sonarqube-unit-reporter/compare/0.0.4...0.0.5
[0.0.4]: https://github.com/tornaia/karma-sonarqube-unit-reporter/releases/tag/0.0.4
[0.0.3]: https://www.npmjs.com/package/karma-sonarqube-unit-reporter/v/0.0.3
[0.0.2]: https://www.npmjs.com/package/karma-sonarqube-unit-reporter/v/0.0.2
[0.0.1]: https://www.npmjs.com/package/karma-sonarqube-unit-reporter/v/0.0.1
[#1]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/1
[#2]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/2
[#3]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/3
[#6]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/6
[#7]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/7
[#9]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/9
[#10]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/10
[#11]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/11
[#12]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/12
[#14]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/14
[#15]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/15
[#16]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/16
[#17]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/17
[#18]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/18
[#20]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/20
[#21]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/21
[#22]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/22
[#23]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/23
[#24]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/24
[#25]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/25
[#26]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/26
[#27]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/27
[#28]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/28
[#29]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/29
[#30]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/30
[#32]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/32
[#33]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/33
[#34]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/34
[#35]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/35
[#36]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/36
[#37]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/37
[#38]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/38
[#39]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/39
[#41]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/41
[#42]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/42
[#44]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/44
[#45]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/45
[#46]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/46
[#48]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/48
[#49]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/49
[#51]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/51
[#52]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/52
[#53]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/53
[#55]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/55
[#57]: https://github.com/tornaia/karma-sonarqube-unit-reporter/pull/57
[#59]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/59
[#64]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/64
[#67]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/67
[#72]: https://github.com/tornaia/karma-sonarqube-unit-reporter/issues/72
