describe('sonarqubeUnit reporter', function () {
  const path = require('path')
  const { createHarness } = require('../support/reporter-harness.js')

  const xml = (lines) => lines.join('\n')

  it('registers as the sonarqubeUnit reporter type with Karma DI metadata', function () {
    const plugin = require('../../index.js')
    const entry = plugin['reporter:sonarqubeUnit']
    expect(entry[0]).toBe('type')
    expect(entry[1].$inject).toEqual(['baseReporterDecorator', 'config', 'logger', 'formatError'])
  })

  it('writes one report per browser named after the browser by default', async function () {
    const h = createHarness({})
    const browser = h.browser('Chrome Headless 120.0.0.0 (Windows 10)')
    h.runSpecs(browser, [
      h.spec(['AppComponent'], 'should create', { time: 17 }),
      h.spec(['AppComponent'], 'should fail <b> & "q"', {
        success: false,
        time: 0,
        log: [
          'Expected true to be false.\n    at UserContext.<anonymous> (src/app/app.component.spec.ts:10:20)',
          'second log & more',
        ],
      }),
      h.spec(['AppComponent', 'nested'], 'is skipped', { skipped: true, time: 0 }),
    ])
    const files = await h.finish()
    expect(Object.keys(files)).toEqual(['ut_report-Chrome_Headless_120.0.0.0_(Windows_10).xml'])
    expect(files['ut_report-Chrome_Headless_120.0.0.0_(Windows_10).xml']).toBe(
      xml([
        '<testExecutions version="1">',
        '  <file path="Chrome_Headless_120_0_0_0_(Windows_10).AppComponent">',
        '    <testCase name="AppComponent should create" duration="17"/>',
        '    <testCase name="AppComponent should fail &lt;b> &amp; &quot;q&quot;" duration="1">',
        '      <failure message="Error">Expected true to be false.',
        '    at UserContext.&lt;anonymous&gt; (src/app/app.component.spec.ts:10:20)',
        '',
        'second log &amp; more',
        '</failure>',
        '    </testCase>',
        '    <testCase name="AppComponent nested is skipped" duration="1">',
        '      <skipped message="Skipped"/>',
        '    </testCase>',
        '  </file>',
        '</testExecutions>',
      ])
    )
    expect(h.logsAt('warn')).toEqual([])
    expect(h.logsAt('error')).toEqual([])
  })

  it('supports useBrowserName: false, outputFile, suite and the SonarQube 5.x root element', async function () {
    const h = createHarness({
      useBrowserName: false,
      outputFile: 'reports/ut_report.xml',
      suite: 'mypkg',
      sonarQubeVersion: '5.x',
    })
    h.runSpecs(h.browser(), [h.spec(['AppComponent'], 'should create')])
    const files = await h.finish()
    expect(files).toEqual({
      'reports/ut_report.xml': xml([
        '<unitTest version="1">',
        '  <file path="mypkg/AppComponent">',
        '    <testCase name="AppComponent should create" duration="12"/>',
        '  </file>',
        '</unitTest>',
      ]),
    })
  })

  it('writes ut_report.xml when useBrowserName is false and no outputFile is given', async function () {
    const h = createHarness({ useBrowserName: false })
    h.runSpecs(h.browser(), [h.spec(['AppComponent'], 'should create')])
    expect(Object.keys(await h.finish())).toEqual(['ut_report.xml'])
  })

  it('puts outputFile into a browser sub directory of outputDir when useBrowserName is true', async function () {
    const h = createHarness({ outputFile: 'ut.xml', outputDir: 'reports' })
    const chrome = h.browser('Chrome Headless 120.0.0.0 (Windows 10)')
    const firefox = h.browser('Firefox 128.0 (Windows 10)')
    h.reporter.onRunStart([chrome, firefox])
    h.reporter.onBrowserStart(chrome)
    h.reporter.onBrowserStart(firefox)
    h.reporter.onSpecComplete(chrome, h.spec(['AppComponent'], 'should create'))
    h.reporter.onSpecComplete(firefox, h.spec(['AppComponent'], 'should create'))
    if (h.reporter.onBrowserComplete) {
      h.reporter.onBrowserComplete(chrome)
      h.reporter.onBrowserComplete(firefox)
    }
    h.reporter.onRunComplete([chrome, firefox], {})
    const files = await h.finish()
    expect(files).toEqual({
      'reports/Chrome_Headless_120.0.0.0_(Windows_10)/ut.xml': xml([
        '<testExecutions version="1">',
        '  <file path="Chrome_Headless_120_0_0_0_(Windows_10).AppComponent">',
        '    <testCase name="AppComponent should create" duration="12"/>',
        '  </file>',
        '</testExecutions>',
      ]),
      'reports/Firefox_128.0_(Windows_10)/ut.xml': xml([
        '<testExecutions version="1">',
        '  <file path="Firefox_128_0_(Windows_10).AppComponent">',
        '    <testCase name="AppComponent should create" duration="12"/>',
        '  </file>',
        '</testExecutions>',
      ]),
    })
  })

  it('resolves outputDir relative to basePath and accepts an absolute outputDir', async function () {
    const relative = createHarness({ useBrowserName: false, outputDir: 'out/dir' })
    relative.runSpecs(relative.browser(), [relative.spec(['A'], 'b')])
    expect(Object.keys(await relative.finish())).toEqual(['out/dir/ut_report.xml'])

    const absolute = createHarness({ useBrowserName: false, outputDir: null })
    const target = path.join(absolute.dir, 'abs')
    const h = createHarness(
      { useBrowserName: false, outputDir: target },
      { basePath: path.join(absolute.dir, 'elsewhere') }
    )
    h.runSpecs(h.browser(), [h.spec(['A'], 'b')])
    await h.finish()
    expect(Object.keys(await absolute.finish())).toEqual(['abs/ut_report.xml'])
  })

  it('applies filenameFormatter and testnameFormatter and logs the transformations', async function () {
    const h = createHarness({
      useBrowserName: false,
      filenameFormatter: (p) => 'prefix/' + p,
      testnameFormatter: (n) => n.toUpperCase(),
    })
    h.runSpecs(h.browser(), [h.spec(['AppComponent'], 'should create')])
    const files = await h.finish()
    expect(files['ut_report.xml']).toBe(
      xml([
        '<testExecutions version="1">',
        '  <file path="prefix/AppComponent">',
        '    <testCase name="APPCOMPONENT SHOULD CREATE" duration="12"/>',
        '  </file>',
        '</testExecutions>',
      ])
    )
    expect(h.logsAt('debug')).toContain(['Transformed File name "AppComponent" -> "prefix/AppComponent"'])
    expect(h.logsAt('debug')).toContain([
      'Transformed test name "AppComponent should create" -> "APPCOMPONENT SHOULD CREATE"',
    ])
  })

  it('keeps the original names when a formatter returns nothing or the same value', async function () {
    const h = createHarness({
      useBrowserName: false,
      filenameFormatter: (p) => p,
      testnameFormatter: () => '',
    })
    h.runSpecs(h.browser(), [h.spec(['AppComponent'], 'should create')])
    const files = await h.finish()
    expect(files['ut_report.xml']).toContain('<file path="AppComponent">')
    expect(files['ut_report.xml']).toContain('<testCase name="AppComponent should create"')
  })

  it('maps descriptions to test files with overrideTestDescription and prependTestFileName', async function () {
    const h = createHarness({
      useBrowserName: false,
      overrideTestDescription: true,
      testPaths: ['test/resources/one_file_multiple_descriptions'],
      testFilePattern: '.spec.js',
      prependTestFileName: 'frontend',
    })
    h.runSpecs(h.browser(), [
      h.spec(['test description'], 'test'),
      h.spec(['another test description'], 'another test'),
    ])
    const files = await h.finish()
    expect(files['ut_report.xml']).toBe(
      xml([
        '<testExecutions version="1">',
        '  <file path="frontend/test/resources/one_file_multiple_descriptions/test.spec.js">',
        '    <testCase name="test description test" duration="12"/>',
        '    <testCase name="another test description another test" duration="12"/>',
        '  </file>',
        '</testExecutions>',
      ])
    )
  })

  it('writes an empty root element for a run without specs', async function () {
    const h = createHarness({ useBrowserName: false })
    h.runSpecs(h.browser(), [])
    expect(await h.finish()).toEqual({ 'ut_report.xml': '<testExecutions version="1"/>' })
  })

  it('writes nothing for a browser that never started', async function () {
    const h = createHarness({ useBrowserName: false })
    const browser = h.browser()
    h.reporter.onRunStart([])
    if (h.reporter.onBrowserComplete) h.reporter.onBrowserComplete(browser)
    h.reporter.onRunComplete([browser], {})
    expect(await h.finish()).toEqual({})
  })

  describe('overrideTestDescription mapping', function () {
    const fixtures = 'test/resources'

    it('maps by the top-level describe even when useBrowserName is on (the default) (#34)', async function () {
      const h = createHarness({
        overrideTestDescription: true,
        testPaths: [fixtures + '/one_file_one_description'],
        testFilePattern: '.spec.js',
      })
      h.runSpecs(h.browser('Chrome Headless 120.0.0.0 (Windows 10)'), [
        h.spec(['test description'], 'a'),
        h.spec(['test description'], 'b'),
      ])
      const files = await h.finish()
      const report = files['ut_report-Chrome_Headless_120.0.0.0_(Windows_10).xml']
      expect(report).toContain('<file path="test/resources/one_file_one_description/test.spec.js">')
      expect(report).toContain('<testCase name="test description a" duration="12"/>')
      expect(report).toContain('<testCase name="test description b" duration="12"/>')
      expect(h.logsAt('warn')).toEqual([])
    })

    it('maps by the top-level describe when the suite option is set (#49)', async function () {
      const h = createHarness({
        useBrowserName: false,
        suite: 'mypkg',
        overrideTestDescription: true,
        testPaths: [fixtures + '/one_file_one_description'],
        testFilePattern: '.spec.js',
      })
      h.runSpecs(h.browser(), [h.spec(['test description'], 'a'), h.spec(['unknown'], 'b')])
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('<file path="test/resources/one_file_one_description/test.spec.js">')
      // unmapped descriptions keep the description-based path, including the suite prefix
      expect(files['ut_report.xml']).toContain('<file path="mypkg/unknown">')
    })

    it('keeps the description as path and warns once when no file is found (#64, #67)', async function () {
      const h = createHarness({
        useBrowserName: false,
        overrideTestDescription: true,
        testPaths: [fixtures + '/one_file_one_description'],
        testFilePattern: '.spec.js',
      })
      h.runSpecs(h.browser(), [
        h.spec(['test description'], 'mapped'),
        h.spec(['[karma-parallel] Add single test to prevent failure'], 'should prevent failing'),
        h.spec(['[karma-parallel] Add single test to prevent failure'], 'second synthetic'),
        h.spec(['Another unknown'], 'x'),
      ])
      const files = await h.finish()
      expect(files['ut_report.xml']).toBe(
        xml([
          '<testExecutions version="1">',
          '  <file path="test/resources/one_file_one_description/test.spec.js">',
          '    <testCase name="test description mapped" duration="12"/>',
          '  </file>',
          '  <file path="[karma-parallel] Add single test to prevent failure">',
          '    <testCase name="[karma-parallel] Add single test to prevent failure should prevent failing" duration="12"/>',
          '    <testCase name="[karma-parallel] Add single test to prevent failure second synthetic" duration="12"/>',
          '  </file>',
          '  <file path="Another unknown">',
          '    <testCase name="Another unknown x" duration="12"/>',
          '  </file>',
          '</testExecutions>',
        ])
      )
      const warnings = h.logsAt('warn')
      expect(warnings.length).toBe(2)
      expect(warnings[0][0]).toContain('No test file found for describe "%s"')
      expect(warnings[0][1]).toBe('[karma-parallel] Add single test to prevent failure')
      expect(warnings[1][1]).toBe('Another unknown')
    })

    it('warns again for the same description in the next run', async function () {
      const h = createHarness({
        useBrowserName: false,
        overrideTestDescription: true,
        testPaths: [fixtures + '/one_file_one_description'],
        testFilePattern: '.spec.js',
      })
      const browser = h.browser()
      h.runSpecs(browser, [h.spec(['unknown'], 'a'), h.spec(['unknown'], 'b')])
      h.runSpecs(browser, [h.spec(['unknown'], 'c')])
      await h.finish()
      expect(h.logsAt('warn').length).toBe(2)
    })

    it('matches a describe written as a Windows path against the file map', async function () {
      const h = createHarness({
        useBrowserName: false,
        overrideTestDescription: true,
        testPaths: [fixtures + '/parser_edge_cases'],
        testFilePattern: 'windows_path.spec.js',
      })
      h.runSpecs(h.browser(), [h.spec(['src\\app\\legacy.spec.js'], 'works')])
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('<file path="test/resources/parser_edge_cases/windows_path.spec.js">')
      expect(h.logsAt('warn')).toEqual([])
    })

    it('passes the mapped file path to a custom filenameFormatter (#29)', async function () {
      const seen = []
      const h = createHarness({
        useBrowserName: false,
        overrideTestDescription: true,
        testPaths: [fixtures + '/one_file_one_description'],
        testFilePattern: '.spec.js',
        filenameFormatter: (filePath, result) => {
          seen.push([filePath, result.description])
          return 'apps/portal/' + filePath
        },
      })
      h.runSpecs(h.browser(), [h.spec(['test description'], 'mapped'), h.spec(['unknown'], 'not mapped')])
      const files = await h.finish()
      expect(seen).toEqual([
        ['test/resources/one_file_one_description/test.spec.js', 'mapped'],
        ['unknown', 'not mapped'],
      ])
      expect(files['ut_report.xml']).toContain(
        '<file path="apps/portal/test/resources/one_file_one_description/test.spec.js">'
      )
      expect(files['ut_report.xml']).toContain('<file path="apps/portal/unknown">')
    })

    it('normalizes prependTestFileName given with a trailing slash or as a Windows path (#44)', async function () {
      for (const [prefix, expected] of [
        ['frontend/', 'frontend/test/resources/one_file_one_description/test.spec.js'],
        ['C:\\proj\\apps\\portal', 'C:/proj/apps/portal/test/resources/one_file_one_description/test.spec.js'],
        ['/home/ci/proj/', '/home/ci/proj/test/resources/one_file_one_description/test.spec.js'],
      ]) {
        const h = createHarness({
          useBrowserName: false,
          overrideTestDescription: true,
          testPaths: [fixtures + '/one_file_one_description'],
          testFilePattern: '.spec.js',
          prependTestFileName: prefix,
        })
        h.runSpecs(h.browser(), [h.spec(['test description'], 'a')])
        const files = await h.finish()
        expect(files['ut_report.xml']).toContain('<file path="' + expected + '">')
      }
    })

    it('does not scan the file system when overrideTestDescription is off', async function () {
      const h = createHarness({ useBrowserName: false, testPaths: ['does/not/exist'] })
      h.runSpecs(h.browser(), [h.spec(['A'], 'one')])
      await h.finish()
      expect(h.logsAt('warn')).toEqual([])
    })
  })

  describe('robustness against unexpected event sequences', function () {
    it('reports specs of a browser that never sent browser_start (#72, #53)', async function () {
      const h = createHarness({ useBrowserName: false })
      const browser = h.browser()
      h.reporter.onRunStart([])
      expect(() => h.reporter.onSpecComplete(browser, h.spec(['A'], 'one'))).not.toThrow()
      if (h.reporter.onBrowserComplete) h.reporter.onBrowserComplete(browser)
      h.reporter.onRunComplete([browser], {})
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('<testCase name="A one" duration="12"/>')
    })

    it('ignores a spec that arrives after run_complete without crashing (#28)', async function () {
      const h = createHarness({ useBrowserName: false })
      const browser = h.browser()
      h.runSpecs(browser, [h.spec(['A'], 'one')])
      expect(() => h.reporter.onSpecComplete(browser, h.spec(['A'], 'late'))).not.toThrow()
      expect(() => h.reporter.onBrowserStart(browser)).not.toThrow()
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('A one')
      expect(files['ut_report.xml']).not.toContain('A late')
    })

    it('starts a fresh report for every run (watch mode)', async function () {
      const h = createHarness({ useBrowserName: false })
      const browser = h.browser()
      h.runSpecs(browser, [h.spec(['A'], 'first run')])
      h.runSpecs(browser, [h.spec(['A'], 'second run')])
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('A second run')
      expect(files['ut_report.xml']).not.toContain('A first run')
    })

    it('strips ANSI color codes from failure output instead of crashing (#51)', async function () {
      const h = createHarness({ useBrowserName: false })
      const ESC = '\x1b'
      h.runSpecs(h.browser(), [
        h.spec(['A'], 'colored', {
          success: false,
          log: ['Expected ' + ESC + '[31mfalse' + ESC + '[39m to be ' + ESC + '[32mtruthy' + ESC + '[39m.'],
        }),
      ])
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('>Expected false to be truthy.\n</failure>')
      expect(files['ut_report.xml']).not.toContain(ESC)
    })

    it('logs a warning instead of throwing when the report cannot be written', async function () {
      const h = createHarness({ useBrowserName: false, outputFile: 'blocked/ut_report.xml' })
      const fs = require('fs')
      fs.writeFileSync(path.join(h.dir, 'blocked'), 'a file where the directory should be')
      expect(() => h.runSpecs(h.browser(), [h.spec(['A'], 'one')])).not.toThrow()
      await h.finish()
      expect(h.logsAt('warn').length).toBe(1)
      expect(h.logsAt('warn')[0].join(' ')).toContain('Cannot write')
    })
  })

  it('groups the test cases of a path into one file element even when specs are interleaved', async function () {
    const h = createHarness({ useBrowserName: false })
    h.runSpecs(h.browser(), [h.spec(['A'], 'one'), h.spec(['B'], 'two'), h.spec(['A'], 'three')])
    const files = await h.finish()
    expect(files['ut_report.xml']).toBe(
      xml([
        '<testExecutions version="1">',
        '  <file path="A">',
        '    <testCase name="A one" duration="12"/>',
        '    <testCase name="A three" duration="12"/>',
        '  </file>',
        '  <file path="B">',
        '    <testCase name="B two" duration="12"/>',
        '  </file>',
        '</testExecutions>',
      ])
    )
  })

  describe('several browsers in one run', function () {
    function runTwo(h, first, second) {
      h.reporter.onRunStart([first.browser, second.browser])
      h.reporter.onBrowserStart(first.browser)
      h.reporter.onBrowserStart(second.browser)
      first.specs.forEach((s) => h.reporter.onSpecComplete(first.browser, s))
      second.specs.forEach((s) => h.reporter.onSpecComplete(second.browser, s))
      if (h.reporter.onBrowserComplete) {
        h.reporter.onBrowserComplete(first.browser)
        h.reporter.onBrowserComplete(second.browser)
      }
      h.reporter.onRunComplete([first.browser, second.browser], {})
    }

    it('merges karma-parallel shards that share the browser name into one report (#37)', async function () {
      const h = createHarness({})
      const name = 'Chrome Headless 120.0.0.0 (Linux x86_64)'
      runTwo(
        h,
        { browser: h.browser(name), specs: [h.spec(['A'], 'from shard one'), h.spec(['B'], 'also shard one')] },
        { browser: h.browser(name), specs: [h.spec(['A'], 'from shard two')] }
      )
      const files = await h.finish()
      expect(Object.keys(files)).toEqual(['ut_report-Chrome_Headless_120.0.0.0_(Linux_x86_64).xml'])
      expect(files['ut_report-Chrome_Headless_120.0.0.0_(Linux_x86_64).xml']).toBe(
        xml([
          '<testExecutions version="1">',
          '  <file path="Chrome_Headless_120_0_0_0_(Linux_x86_64).A">',
          '    <testCase name="A from shard one" duration="12"/>',
          '    <testCase name="A from shard two" duration="12"/>',
          '  </file>',
          '  <file path="Chrome_Headless_120_0_0_0_(Linux_x86_64).B">',
          '    <testCase name="B also shard one" duration="12"/>',
          '  </file>',
          '</testExecutions>',
        ])
      )
    })

    it('merges different browsers into the single report when useBrowserName is false', async function () {
      const h = createHarness({ useBrowserName: false, outputFile: 'reports/ut_report.xml' })
      runTwo(
        h,
        { browser: h.browser('Chrome Headless 120.0.0.0 (Windows 10)'), specs: [h.spec(['A'], 'one')] },
        { browser: h.browser('Firefox 128.0 (Windows 10)'), specs: [h.spec(['A'], 'one'), h.spec(['B'], 'two')] }
      )
      const files = await h.finish()
      expect(Object.keys(files)).toEqual(['reports/ut_report.xml'])
      expect(files['reports/ut_report.xml']).toBe(
        xml([
          '<testExecutions version="1">',
          '  <file path="A">',
          '    <testCase name="A one" duration="12"/>',
          '    <testCase name="A one" duration="12"/>',
          '  </file>',
          '  <file path="B">',
          '    <testCase name="B two" duration="12"/>',
          '  </file>',
          '</testExecutions>',
        ])
      )
    })

    it('writes the reports when the run completes, not per browser', async function () {
      const fs = require('fs')
      const h = createHarness({ useBrowserName: false })
      const browser = h.browser()
      h.reporter.onRunStart([browser])
      h.reporter.onBrowserStart(browser)
      h.reporter.onSpecComplete(browser, h.spec(['A'], 'one'))
      if (h.reporter.onBrowserComplete) h.reporter.onBrowserComplete(browser)
      expect(fs.existsSync(path.join(h.dir, 'ut_report.xml'))).toBe(false)
      h.reporter.onRunComplete([browser], {})
      expect(fs.existsSync(path.join(h.dir, 'ut_report.xml'))).toBe(true)
      await h.finish()
    })
  })

  // Behaviour documented as-is; later commits change these on purpose.
  describe('current output details', function () {
    it('passes a fractional duration through unchanged', async function () {
      const h = createHarness({ useBrowserName: false })
      h.runSpecs(h.browser(), [h.spec(['A'], 'one', { time: 3.7 })])
      const files = await h.finish()
      expect(files['ut_report.xml']).toContain('duration="3.7"')
    })
  })
})
