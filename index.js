'use strict'

const path = require('path')
const fs = require('fs')
const fileUtil = require('./src/file-util.js')
const xml = require('./src/xml-writer.js')

const SonarQubeUnitReporter = function (baseReporterDecorator, config, logger, formatError) {
  const log = logger.create('reporter.sonarqubeUnit')
  const reporterConfig = config.sonarQubeUnitReporter || {}

  // SonarQube < 6.2 used the unitTest root element, everything since uses testExecutions.
  const rootElementName = reporterConfig.sonarQubeVersion === '5.x' ? 'unitTest' : 'testExecutions'
  const suitePrefix = reporterConfig.suite || ''
  const outputFile = reporterConfig.outputFile
  const useBrowserName = reporterConfig.useBrowserName === undefined ? true : !!reporterConfig.useBrowserName
  const outputDir = path.resolve(
    config.basePath || process.cwd(),
    reporterConfig.outputDir == null ? '.' : String(reporterConfig.outputDir)
  )

  const userFilenameFormatter =
    typeof reporterConfig.filenameFormatter === 'function' ? reporterConfig.filenameFormatter : null
  const testnameFormatter =
    typeof reporterConfig.testnameFormatter === 'function' ? reporterConfig.testnameFormatter : null

  // Optional mapping of describe names to the test files that contain them.
  const overrideTestDescription = !!reporterConfig.overrideTestDescription
  const prependTestFileName = reporterConfig.prependTestFileName || ''
  const testPaths = [].concat(reporterConfig.testPaths || reporterConfig.testPath || './')
  const testFilePattern = reporterConfig.testFilePattern || /(\.spec\.ts|\.spec.js)/
  const filesForDescriptions = overrideTestDescription
    ? fileUtil.getFilesForDescriptions(resolveTestPaths(testPaths), testFilePattern, {
        log,
        describeFunctions: reporterConfig.describeFunctions,
      })
    : Object.create(null)

  // testPaths are relative to the working directory, like the paths written
  // into the report. When an entry does not exist there but does exist
  // relative to Karma's basePath (monorepos, `ng test some-project`), that
  // one is used, expressed relative to the working directory when possible.
  function resolveTestPaths(paths) {
    return paths.map((entry) => {
      const given = String(entry)
      if (path.isAbsolute(given) || fs.existsSync(given)) {
        return given
      }
      const fromBasePath = path.resolve(config.basePath || process.cwd(), given)
      if (!fs.existsSync(fromBasePath)) {
        return given
      }
      const relative = path.relative(process.cwd(), fromBasePath)
      const chosen =
        relative === '' ? '.' : relative.startsWith('..') || path.isAbsolute(relative) ? fromBasePath : relative
      log.debug(
        'testPaths entry "%s" does not exist in the working directory, using "%s" (from basePath)',
        given,
        chosen
      )
      return chosen
    })
  }

  baseReporterDecorator(this)

  // This reporter only writes files; nothing goes to the terminal.
  this.adapters = []

  // browser.id -> { browser, files: Map<path, { path, testCases: [{ name, duration, skipped, failure }] }> }
  let reports = new Map()
  // describe names already reported as unmapped in this run, to warn once per name
  let unmappedDescriptions = new Set()

  function getReport(browser) {
    let report = reports.get(browser.id)
    if (!report) {
      report = { browser, files: new Map() }
      reports.set(browser.id, report)
    }
    return report
  }

  this.onRunStart = function (browsers) {
    reports = new Map()
    unmappedDescriptions = new Set()
    if (browsers && typeof browsers.forEach === 'function') {
      browsers.forEach(getReport)
    }
  }

  this.onBrowserStart = function (browser) {
    getReport(browser)
  }

  this.onSpecComplete = function (browser, result) {
    const report = getReport(browser)
    const filePath = resolveFilePath(browser, result)

    let file = report.files.get(filePath)
    if (!file) {
      file = { path: filePath, testCases: [] }
      report.files.set(filePath, file)
    }

    const log = Array.isArray(result.log) ? result.log : []
    const testCase = {
      name: resolveTestName(result),
      // the schema wants a positive integer number of milliseconds
      duration: Math.max(1, Math.round(Number(result.time) || 0)),
      skipped: !!result.skipped,
      failure: null,
    }
    if (!result.success) {
      testCase.failure = {
        message: failureMessage(log),
        text: log.length ? formatError(log.join('\n\n')) : '',
      }
    }
    file.testCases.push(testCase)
  }

  // Reports are written once the whole run is complete, so browsers that
  // share an output file (karma-parallel shards, or several browsers with
  // useBrowserName: false) end up merged instead of overwriting each other.
  this.onRunComplete = function () {
    writeReports()
    reports = new Map()
  }

  // The first line of the failure log is the assertion message; the rest is
  // the stack trace, which goes into the element text.
  function failureMessage(log) {
    for (const entry of log) {
      const line = String(entry)
        .split(/\r?\n/)
        .find((l) => l.trim() !== '')
      if (line) {
        return line.trim()
      }
    }
    return 'Error'
  }

  function suitesOf(result) {
    return Array.isArray(result.suite) ? result.suite : []
  }

  // The top-level describe; a spec outside any describe falls back to its own name.
  function topLevelSuite(result) {
    const suites = suitesOf(result)
    return String(suites.length ? suites[0] : result.description || '')
  }

  // The path attribute before any mapping: [browser.][suite/]top-level describe
  function describedPath(browser, result) {
    const browserName = safeName(browser).replace(/\./g, '_') + '.'
    const described =
      (useBrowserName ? browserName : '') + (suitePrefix ? suitePrefix + '/' : '') + topLevelSuite(result)
    return described.replace(/\\/g, '/')
  }

  // 1. description-based path, 2. optionally replaced by the mapped test file,
  // 3. optionally post-processed by the user's filenameFormatter
  function resolveFilePath(browser, result) {
    const preMapped = describedPath(browser, result)
    const mapped = overrideTestDescription ? mappedFilePath(preMapped, result) : preMapped
    return userFilenameFormatter ? applyFilenameFormatter(mapped, result) : mapped
  }

  // overrideTestDescription: the top-level describe (without browser or suite
  // prefix) selects the test file; when it is unknown the description-based
  // path is kept so the rest of the report is still usable.
  function mappedFilePath(preMapped, result) {
    const key = topLevelSuite(result).replace(/\\/g, '/')
    const file = filesForDescriptions[key]
    if (!file) {
      if (!unmappedDescriptions.has(key)) {
        unmappedDescriptions.add(key)
        log.warn(
          'No test file found for describe "%s" (searched %s for files matching %s); using "%s" as the path. ' +
            'Check testPaths, testFilePattern and describeFunctions.',
          key,
          JSON.stringify(testPaths),
          String(testFilePattern),
          preMapped
        )
      }
      return preMapped
    }
    const nextPath = withPrefix(file)
    log.debug('Transformed File name "' + preMapped + '" -> "' + nextPath + '"')
    return nextPath
  }

  // prependTestFileName may be given with a trailing slash or as a Windows
  // path (__dirname); the result always uses single forward slashes.
  function withPrefix(file) {
    if (prependTestFileName === '') {
      return file
    }
    const prefix = String(prependTestFileName).replace(/\\/g, '/').replace(/\/+$/, '')
    return prefix + '/' + file.replace(/^\.\//, '')
  }

  function applyFilenameFormatter(preMapped, result) {
    const nextPath = userFilenameFormatter(preMapped, result)
    if (!nextPath) {
      log.warn('filenameFormatter returned nothing for "%s"; keeping it', preMapped)
      return preMapped
    }
    if (preMapped !== nextPath) {
      log.debug('Transformed File name "' + preMapped + '" -> "' + nextPath + '"')
    } else {
      log.debug('Name not transformed for File "' + preMapped + '"')
    }
    return nextPath
  }

  function resolveTestName(result) {
    const suites = suitesOf(result)
    let testname = String(result.description || '')
    for (let i = suites.length - 1; i >= 0; i--) {
      testname = suites[i] + ' ' + testname
    }
    if (!testnameFormatter) {
      return testname
    }
    const formatted = testnameFormatter(testname, result)
    if (formatted && formatted !== testname) {
      log.debug('Transformed test name "' + testname + '" -> "' + formatted + '"')
      return formatted
    }
    log.debug('Name not transformed for test "' + testname + '"')
    return testname
  }

  function safeName(browser) {
    return String(browser.name || browser.id || 'browser').replace(/ /g, '_')
  }

  function outputFileFor(browser) {
    const safeBrowserName = safeName(browser)
    if (outputFile != null) {
      const dir = useBrowserName ? path.join(outputDir, safeBrowserName) : outputDir
      return path.join(dir, outputFile)
    }
    return path.join(outputDir, useBrowserName ? 'ut_report-' + safeBrowserName + '.xml' : 'ut_report.xml')
  }

  function toElement(files) {
    return {
      name: rootElementName,
      attributes: { version: '1' },
      children: files.map((file) => ({
        name: 'file',
        attributes: { path: file.path },
        children: file.testCases.map((testCase) => {
          const children = []
          if (testCase.skipped) {
            children.push({ name: 'skipped', attributes: { message: 'Skipped' } })
          }
          if (testCase.failure) {
            children.push({
              name: 'failure',
              attributes: { message: testCase.failure.message },
              text: testCase.failure.text,
            })
          }
          return { name: 'testCase', attributes: { name: testCase.name, duration: testCase.duration }, children }
        }),
      })),
    }
  }

  function writeReports() {
    // output file -> Map<path, merged file entry>
    const byOutputFile = new Map()
    reports.forEach((report) => {
      const outputPath = outputFileFor(report.browser)
      let merged = byOutputFile.get(outputPath)
      if (!merged) {
        merged = new Map()
        byOutputFile.set(outputPath, merged)
      }
      report.files.forEach((file, filePath) => {
        let target = merged.get(filePath)
        if (!target) {
          target = { path: filePath, testCases: [] }
          merged.set(filePath, target)
        }
        file.testCases.forEach((testCase) => target.testCases.push(testCase))
      })
    })
    byOutputFile.forEach((files, outputPath) => writeReport(outputPath, Array.from(files.values())))
  }

  function writeReport(outputPath, files) {
    try {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, xml.serialize(toElement(files)))
      log.debug('SonarQube test execution report written to "%s".', outputPath)
    } catch (err) {
      log.warn('Cannot write SonarQube test execution report "%s": %s', outputPath, err.message)
    }
  }
}

SonarQubeUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'formatError']

// PUBLISH DI MODULE
module.exports = {
  'reporter:sonarqubeUnit': ['type', SonarQubeUnitReporter],
}
