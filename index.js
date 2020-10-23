var path = require('path')
var fs = require('fs')
var builder = require('xmlbuilder')
var fileUtil = require('./src/file-util.js')

var SonarQubeUnitReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.sonarqubeUnit')
  var reporterConfig = config.sonarQubeUnitReporter || {}
  var sonarQubeVersion = reporterConfig.sonarQubeVersion || 'LATEST'
  var pkgName = reporterConfig.suite || ''
  var outputDir = reporterConfig.outputDir
  var outputFile = reporterConfig.outputFile
  var useBrowserName = reporterConfig.useBrowserName

  var filenameFormatter = reporterConfig.filenameFormatter || null
  var testnameFormatter = reporterConfig.testnameFormatter || null

  var suites
  var pendingFileWritings = 0
  var fileWritingFinished = function() {}
  var allMessages = []

  if (outputDir == null) {
    outputDir = '.'
  }

  outputDir = helper.normalizeWinPath(path.resolve(config.basePath, outputDir)) + path.sep

  if (typeof useBrowserName === 'undefined') {
    useBrowserName = true
  }

  baseReporterDecorator(this)

  this.adapters = [
    function(msg) {
      allMessages.push(msg)
    },
  ]

  var initliazeXmlForBrowser = function(browser) {
    var tagName
    switch (sonarQubeVersion) {
      case '5.x':
        tagName = 'unitTest'
        break
      default:
        tagName = 'testExecutions'
    }

    var parentTag = (suites[browser.id] = builder.create(
      tagName,
      { version: '1.0', encoding: 'UTF-8', standalone: true },
      { pubID: null, sysID: null },
      {
        allowSurrogateChars: false,
        skipNullAttributes: false,
        headless: true,
        ignoreDecorators: false,
        separateArrayItems: false,
        noDoubleEncoding: false,
        stringify: {},
      }
    ))

    parentTag.att('version', '1')
  }

  var writeXmlForBrowser = function(browser) {
    var safeBrowserName = browser.name.replace(/ /g, '_')
    var newOutputFile

    if (outputFile != null) {
      var dir = useBrowserName ? path.join(outputDir, safeBrowserName) : outputDir
      newOutputFile = path.join(dir, outputFile)
    } else if (useBrowserName) {
      newOutputFile = path.join(outputDir, 'ut_report-' + safeBrowserName + '.xml')
    } else {
      newOutputFile = path.join(outputDir, 'ut_report.xml')
    }

    var xmlToOutput = suites[browser.id]
    if (!xmlToOutput) {
      return // don't die if browser didn't start
    }

    pendingFileWritings++
    helper.mkdirIfNotExists(path.dirname(newOutputFile), function() {
      fs.writeFile(newOutputFile, xmlToOutput.end({ pretty: true }), function(err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message)
        } else {
          log.debug('JUnit results written to "%s".', newOutputFile)
        }

        if (!--pendingFileWritings) {
          fileWritingFinished()
        }
      })
    })
  }

  var getClassName = function(browser, result) {
    var browserName = browser.name.replace(/ /g, '_').replace(/\./g, '_') + '.'

    return (useBrowserName ? browserName : '') + (pkgName ? pkgName + '/' : '') + result.suite[0]
  }

  this.onRunStart = function(browsers) {
    suites = Object.create(null)

    // TODO(vojta): remove once we don't care about Karma 0.10
    browsers.forEach(initliazeXmlForBrowser)
  }

  this.onBrowserStart = function(browser) {
    initliazeXmlForBrowser(browser)
  }

  this.onBrowserComplete = function(browser) {
    var suite = suites[browser.id]
    var result = browser.lastResult
    if (!suite || !result) {
      return // don't die if browser didn't start
    }

    writeXmlForBrowser(browser)
  }

  this.onRunComplete = function() {
    suites = null
    allMessages.length = 0
  }

  this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
    var preMapped = getClassName(browser, result).replace(/\\/g, '/')
    var nextPath = preMapped
    if (filenameFormatter !== null) {
      nextPath = filenameFormatter(nextPath, result)
      if (!nextPath) {
        log.warn('No filename found for description: ' + nextPath)
      } else if (preMapped !== nextPath) {
        log.debug('Transformed File name "' + preMapped + '" -> "' + nextPath + '"')
      } else {
        log.debug('Name not transformed for File "' + preMapped + '"')
      }
    }

    var fileNodes = suites[browser.id]
    var lastFilePath

    var numberOfFileNodes = fileNodes.children.length
    if (numberOfFileNodes > 0) {
      lastFilePath = fileNodes.children[numberOfFileNodes - 1].attributes.getNamedItem('path').value
      if (lastFilePath !== nextPath) {
        suites[browser.id].ele('file', {
          path: nextPath,
        })
      }
    } else {
      suites[browser.id].ele('file', {
        path: nextPath,
      })
    }
    lastFilePath = nextPath

    var appendToThisNode = suites[browser.id].children[suites[browser.id].children.length - 1]

    function getDescription(result) {
      var desc = result.description
      for (var i = result.suite.length - 1; i >= 0; i--) {
        desc = result.suite[i] + ' ' + desc
      }
      return desc
    }

    var testname = getDescription(result)
    var testnameFormatted = testname

    if (testnameFormatter !== null) {
      testnameFormatted = testnameFormatter(testname, result)
      if (testnameFormatted && testnameFormatted !== testname) {
        log.debug('Transformed test name "' + testname + '" -> "' + testnameFormatted + '"')
      } else {
        testnameFormatted = testname
        log.debug('Name not transformed for test "' + testnameFormatted + '"')
      }
    }
    var testCase = appendToThisNode.ele('testCase', {
      name: testnameFormatted,
      duration: result.time || 1,
    })

    if (result.skipped) {
      testCase.ele('skipped', { message: 'Skipped' })
    }

    if (!result.success) {
      testCase.ele('failure', { message: 'Error' }, formatError(result.log.join('\n\n')))
    }
  }

  // wait for writing all the xml files, before exiting
  this.onExit = function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done
    } else {
      done()
    }
  }

  // look for jasmine test files in the specified path
  var overrideTestDescription = reporterConfig.overrideTestDescription || false
  var testPath = reporterConfig.testPath || './'
  var testPaths = reporterConfig.testPaths || [testPath]
  var testFilePattern = reporterConfig.testFilePattern || /(\.spec\.ts|\.spec.js)/
  var prependTestFileName = reporterConfig.prependTestFileName || ''
  var filesForDescriptions = fileUtil.getFilesForDescriptions(testPaths, testFilePattern)

  function defaultFilenameFormatter(nextPath, result) {
    if (prependTestFileName !== '') {
      return prependTestFileName + '/' + filesForDescriptions[nextPath]
    } else {
      return filesForDescriptions[nextPath]
    }
  }

  if (overrideTestDescription) {
    filenameFormatter = defaultFilenameFormatter
  }
}

SonarQubeUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError']

// PUBLISH DI MODULE
module.exports = {
  'reporter:sonarqubeUnit': ['type', SonarQubeUnitReporter],
}
