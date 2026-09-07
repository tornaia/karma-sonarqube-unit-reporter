'use strict'

// Dependency-free smoke test: drives the reporter through the Karma reporter
// contract with fakes and checks the written XML. It runs on any Node version
// the package supports (`engines.node`), unlike the jasmine-based specs.
//
//   node test/smoke.js

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const plugin = require('../index.js')
const entry = plugin['reporter:sonarqubeUnit']
assert.ok(Array.isArray(entry) && entry[0] === 'type', 'plugin must export reporter:sonarqubeUnit as a type')
const Reporter = entry[1]

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ksur-smoke-'))
const logs = []
const logger = {
  create: function () {
    const push = function (level) {
      return function () {
        logs.push([level].concat(Array.prototype.slice.call(arguments)))
      }
    }
    return { debug: push('debug'), info: push('info'), warn: push('warn'), error: push('error') }
  },
}
const helper = {
  normalizeWinPath: function (p) {
    return p
  },
  mkdirIfNotExists: function (d, done) {
    fs.mkdirSync(d, { recursive: true })
    done()
  },
}
const formatError = function (msg) {
  return msg + '\n'
}
const baseReporterDecorator = function (self) {
  self.adapters = []
  self.onSpecComplete = function (browser, result) {
    if (result.skipped) this.specSkipped(browser, result)
    else if (result.success) this.specSuccess(browser, result)
    else this.specFailure(browser, result)
  }
}
const config = {
  basePath: dir,
  sonarQubeUnitReporter: { useBrowserName: false, outputFile: 'reports/ut_report.xml' },
}

// Resolve the constructor arguments the way Karma's DI does, from $inject.
const services = {
  baseReporterDecorator: baseReporterDecorator,
  config: config,
  logger: logger,
  helper: helper,
  formatError: formatError,
}
const reporter = new (Function.prototype.bind.apply(
  Reporter,
  [null].concat(
    Reporter.$inject.map(function (name) {
      return services[name]
    })
  )
))()
const browser = { id: 'smoke-1', name: 'Chrome Headless 120.0.0.0 (Linux x86_64)', lastResult: {} }
const spec = function (suite, description, extra) {
  return Object.assign(
    { suite: suite, description: description, success: true, skipped: false, time: 5, log: [] },
    extra
  )
}

reporter.onRunStart([browser])
reporter.onBrowserStart(browser)
reporter.onSpecComplete(browser, spec(['AppComponent'], 'should create'))
reporter.onSpecComplete(
  browser,
  spec(['AppComponent'], 'should fail', { success: false, log: ['Expected 1 to be 2.\n    at <Jasmine>'] })
)
reporter.onSpecComplete(browser, spec(['AppComponent'], 'is pending', { skipped: true, time: 0 }))
if (reporter.onBrowserComplete) reporter.onBrowserComplete(browser)
reporter.onRunComplete([browser], {})

function finish() {
  const file = path.join(dir, 'reports', 'ut_report.xml')
  assert.ok(fs.existsSync(file), 'report file must exist: ' + file)
  const xml = fs.readFileSync(file, 'utf8')
  fs.rmSync(dir, { recursive: true, force: true })

  assert.ok(xml.indexOf('<testExecutions version="1">') === 0, 'root element')
  assert.ok(xml.indexOf('<file path="AppComponent">') > 0, 'file element')
  assert.ok(xml.indexOf('<testCase name="AppComponent should create" duration="5"/>') > 0, 'success case')
  assert.ok(xml.indexOf('<failure message=') > 0 && xml.indexOf('Expected 1 to be 2.') > 0, 'failure case')
  assert.ok(xml.indexOf('<skipped message="Skipped"/>') > 0, 'skipped case')
  assert.ok(xml.indexOf('&lt;Jasmine&gt;') > 0, 'text content is escaped')
  const failed = logs.filter(function (l) {
    return l[0] === 'error' || l[0] === 'warn'
  })
  assert.strictEqual(failed.length, 0, 'no warnings or errors expected, got: ' + JSON.stringify(failed))
  console.log('smoke test OK (node ' + process.version + ')')
}

if (reporter.onExit) reporter.onExit(finish)
else finish()
