### karma-sonarqube-unit-reporter

[![NpmLicense](https://img.shields.io/npm/l/karma-sonarqube-unit-reporter.svg)](https://opensource.org/licenses/MIT) [![npm](https://img.shields.io/npm/dt/karma-sonarqube-unit-reporter.svg)](https://npmjs.com/package/karma-sonarqube-unit-reporter) [![NpmVersion](https://img.shields.io/npm/v/karma-sonarqube-unit-reporter.svg)](https://npmjs.com/package/karma-sonarqube-unit-reporter)

##### Donate

Clear feedback. Just if you appreciate my efforts!

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=3V7ZGPEGL55VS)

##### Motivation

This solution is based on https://github.com/karma-runner/karma-junit-reporter .

Issue: https://github.com/karma-runner/karma-junit-reporter/issues/81

##### How to get

Available on npmjs.org
https://www.npmjs.com/package/karma-sonarqube-unit-reporter

##### How to use

Sample karma.conf.ci.js
```xml
'use strict';

var path = require('path');
var conf = require('./gulp/conf');

var _ = require('lodash');
var wiredep = require('wiredep');

var pathSrcHtml = [
  path.join(conf.paths.src, '/**/*.html'),
  path.join(conf.paths.src_test, '/**/*.html')
];

function listFiles() {
  var wiredepOptions = _.extend({}, conf.wiredep, {
    dependencies: true,
    devDependencies: true
  });

  return wiredep(wiredepOptions).js
    .concat([
      path.join(conf.paths.src, '/app/**/*.module.js'),
      path.join(conf.paths.src, '/app/**/*.js'),
      path.join(conf.paths.src, '/**/*.spec.js'),
      path.join(conf.paths.src, '/**/*.mock.js'),
      path.join(conf.paths.src_test, '/app/**/*.module.js'),
      path.join(conf.paths.src_test, '/app/**/*.js'),
      path.join(conf.paths.src_test, '/**/*.spec.js'),
      path.join(conf.paths.src_test, '/**/*.mock.js')
    ])
    .concat(pathSrcHtml);
}

module.exports = function(config) {

  var configuration = {
    files: listFiles(),

    singleRun: true,
	
    colors:    false,

    autoWatch: false,

    ngHtml2JsPreprocessor: {
      stripPrefix: conf.paths.src + '/',
      moduleName: 'TODO_PUT_HERE_YOUR_MODULE_NAME'
    },

    logLevel: 'WARN',

    frameworks: ['jasmine', 'angular-filesort'],

    angularFilesort: {
      whitelist: [path.join(conf.paths.src, '/**/!(*.html|*.spec|*.mock).js'), path.join(conf.paths.src_test, '/**/!(*.html|*.spec|*.mock).js')]
    },

    browsers: ['PhantomJS'],

    sonarQubeUnitReporter: {
      sonarQubeVersion: 'LATEST',
      outputFile: 'reports/ut_report.xml',
      useBrowserName: false
    },

    plugins: [
      'karma-phantomjs-launcher',
      'karma-angular-filesort',
      'karma-coverage',
      'karma-jasmine',
      'karma-ng-html2js-preprocessor',
      'karma-sonarqube-unit-reporter'
    ],

    coverageReporter: {
      type : 'lcov',
      dir : 'reports',
      subdir : 'coverage'
    },

    reporters: ['progress', 'sonarqubeUnit', 'coverage'],
    
    preprocessors: {
      'src/**/*.js':   ['coverage'],
      'test/**/*.js':   ['coverage']
    }
  };

  config.set(configuration);
};
```

By default, the description of the jasmine tests used as the path attribute in the generated xml. If this is not the case with your tests, you can use the following options to automagically find the right path values. It is the recommended way to use this plugin but to be backward compatible it is not enabled by default.

```
sonarQubeUnitReporter: {
      sonarQubeVersion: 'LATEST',
      outputFile: 'reports/ut_report.xml',
      overrideTestDescription: true,
      testPaths: ['./test', './moreTests'],
      testFilePattern: '.spec.js',
      useBrowserName: false
},
```

##### Prerequisites for development

* NodeJS 8.0.0 https://nodejs.org/download/release/v8.0.0/

##### Build

* npm install
* npm build

##### Additional Arguments

```
sonarQubeUnitReporter: {
  prependTestFileName: 'frontend' # This adds a string to the front of the generated file name in the report
                                  # Useful if you run tests from within a subdirectory
}
```