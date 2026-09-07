'use strict'

// Drives the reporter through the Karma reporter contract with fakes for the
// injected services (baseReporterDecorator, config, logger, helper, formatError).

const fs = require('fs')
const os = require('os')
const path = require('path')

const Reporter = require('../../index.js')['reporter:sonarqubeUnit'][1]

function fakeLogger() {
  const entries = []
  const push = (level) =>
    function () {
      entries.push([level].concat(Array.prototype.slice.call(arguments)))
    }
  return {
    entries,
    create: () => ({ debug: push('debug'), info: push('info'), warn: push('warn'), error: push('error') }),
  }
}

// Mimics what Karma's BaseReporter.decoratorFactory installs on a reporter.
function baseReporterDecorator(self) {
  self.adapters = [() => {}]
  self.onSpecComplete = function (browser, result) {
    if (result.skipped) this.specSkipped(browser, result)
    else if (result.success) this.specSuccess(browser, result)
    else this.specFailure(browser, result)
  }
}

const helper = {
  normalizeWinPath: (p) => p,
  mkdirIfNotExists: (dir, done) => {
    fs.mkdirSync(dir, { recursive: true })
    done()
  },
}

// Karma's formatError strips its own URL prefix and appends a newline.
const formatError = (message) => message + '\n'

/**
 * @param {object} reporterConfig the `sonarQubeUnitReporter` section
 * @param {{basePath?: string}} [options]
 */
function createHarness(reporterConfig, options) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ksur-reporter-'))
  const config = {
    basePath: (options && options.basePath) || dir,
    sonarQubeUnitReporter: reporterConfig,
  }
  const logger = fakeLogger()
  const reporter = new Reporter(baseReporterDecorator, config, logger, helper, formatError)

  let counter = 0
  return {
    dir,
    reporter,
    logs: logger.entries,
    logsAt(level) {
      return logger.entries.filter((e) => e[0] === level).map((e) => e.slice(1))
    },
    browser(name, id) {
      counter += 1
      return { id: id || 'browser-' + counter, name: name || 'Chrome Headless 120.0.0.0 (Windows 10)', lastResult: {} }
    },
    spec(suite, description, extra) {
      return Object.assign({ suite, description, success: true, skipped: false, time: 12, log: [] }, extra)
    },
    /** Runs a complete single-browser run: start, the given specs, complete. */
    runSpecs(browser, specs) {
      reporter.onRunStart([browser])
      reporter.onBrowserStart(browser)
      specs.forEach((s) => reporter.onSpecComplete(browser, s))
      if (reporter.onBrowserComplete) reporter.onBrowserComplete(browser)
      reporter.onRunComplete([browser], {})
    },
    /** Waits for pending writes (if the reporter has onExit) and returns {relativePath: content}. */
    finish() {
      return new Promise((resolve) => {
        const done = () => {
          const files = {}
          const walk = (d) =>
            fs.readdirSync(d).forEach((name) => {
              const p = path.join(d, name)
              if (fs.statSync(p).isDirectory()) walk(p)
              else files[path.relative(dir, p).replace(/\\/g, '/')] = fs.readFileSync(p, 'utf8')
            })
          walk(dir)
          fs.rmSync(dir, { recursive: true, force: true })
          resolve(files)
        }
        if (reporter.onExit) reporter.onExit(done)
        else done()
      })
    },
  }
}

module.exports = { createHarness }
