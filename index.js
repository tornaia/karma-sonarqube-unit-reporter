// set sonar.genericcoverage.unitTestReportPaths to reports/TEST-xunit.xml
// TODO failure, error, skipped is NOT supported yet
var os = require('os')
var path = require('path')
var fs = require('fs')
var builder = require('xmlbuilder')

var SonarQubeUnitReporter = function (baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.sonarqubeUnit')
  var reporterConfig = config.sonarQubeUnitReporter || {}
  var pkgName = reporterConfig.suite || ''
  var outputDir = reporterConfig.outputDir
  var outputFile = reporterConfig.outputFile
  var useBrowserName = reporterConfig.useBrowserName

  var suites
  var pendingFileWritings = 0
  var fileWritingFinished = function () {}
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
    function (msg) {
      allMessages.push(msg)
    }
  ]

  var initliazeXmlForBrowser = function (browser) {
    var timestamp = (new Date()).toISOString().substr(0, 19)
    var unitTest = suites[browser.id] = builder.create('unitTest',
                                                       {version: '1.0', encoding: 'UTF-8', standalone: true},
                                                       {pubID: null, sysID: null},
                                                       {allowSurrogateChars: false, skipNullAttributes: false, headless: true, ignoreDecorators: false, separateArrayItems: false, noDoubleEncoding: false, stringify: {}})
    unitTest.att('version', '1')
	
  }

  var writeXmlForBrowser = function (browser) {
    var safeBrowserName = browser.name.replace(/ /g, '_')
    var newOutputFile
    if (outputFile != null) {
      var dir = useBrowserName ? path.join(outputDir, safeBrowserName)
                               : outputDir
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
    helper.mkdirIfNotExists(path.dirname(newOutputFile), function () {
      fs.writeFile(newOutputFile, xmlToOutput.end({pretty: true}), function (err) {
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

  var getClassName = function (browser, result) {
    var browserName = browser.name.replace(/ /g, '_').replace(/\./g, '_') + '.'

    return (useBrowserName ? browserName : '') + (pkgName ? pkgName + '.' : '') + result.suite[0]
  }

  this.onRunStart = function (browsers) {
    suites = Object.create(null)

    // TODO(vojta): remove once we don't care about Karma 0.10
    browsers.forEach(initliazeXmlForBrowser)
  }

  this.onBrowserStart = function (browser) {
    initliazeXmlForBrowser(browser)
  }

  this.onBrowserComplete = function (browser) {
    var suite = suites[browser.id]
    var result = browser.lastResult
    if (!suite || !result) {
      return // don't die if browser didn't start
    }

    writeXmlForBrowser(browser)
  }

  this.onRunComplete = function () {
    suites = null
    allMessages.length = 0
  }
  
  this.specSuccess = this.specSkipped = this.specFailure = function (browser, result) {
	var nextPath = getClassName(browser, result).replace(new RegExp(/\\/, 'g'), '/');
	var fileNodes = suites[browser.id];
	var lastFilePath;
	
	var numberOfFileNodes = fileNodes.children.length;
	if (numberOfFileNodes > 0) {
	  lastFilePath = fileNodes.children[numberOfFileNodes-1].attributes.path.value;
	  if (lastFilePath !== nextPath) {
	    suites[browser.id].ele('file', {
		  path: nextPath
	    })
	  }
	} else {
	  suites[browser.id].ele('file', {
        path: nextPath
	  })
	}
	lastFilePath = nextPath;
	
	var appendToThisNode = suites[browser.id].children[suites[browser.id].children.length - 1];
	
	appendToThisNode.ele('testCase', {name: result.description, duration : (result.time || 0)});
  }

  // wait for writing all the xml files, before exiting
  this.onExit = function (done) {
    if (pendingFileWritings) {
      fileWritingFinished = done
    } else {
      done()
    }
  }
}

SonarQubeUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError']

// PUBLISH DI MODULE
module.exports = {
  'reporter:sonarqubeUnit': ['type', SonarQubeUnitReporter]
}
