'use strict'

// Integration test: runs the fixtures through a real Karma server with
// karma-jasmine and a headless Chrome, then checks the report the reporter
// wrote. Needs Chrome (or CHROME_BIN pointing to one).
//
//   npm run test:integration

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { config: karmaConfig, Server } = require('karma')

const root = path.resolve(__dirname, '..', '..')
const outputDir = path.join(root, 'test', 'integration', 'output')
const reportFile = path.join(outputDir, 'ut_report.xml')

async function main() {
  process.chdir(root)
  fs.rmSync(outputDir, { recursive: true, force: true })

  const config = await karmaConfig.parseConfig(
    path.join(__dirname, 'karma.conf.js'),
    {},
    { promiseConfig: true, throwErrors: true }
  )

  // One fixture fails on purpose, so Karma exits with 1; the report content is what matters here.
  const exitCode = await new Promise((resolve, reject) => {
    const server = new Server(config, resolve)
    server.start().catch(reject)
  })
  assert.strictEqual(exitCode, 1, 'Karma should report the intentionally failing spec')

  assert.ok(fs.existsSync(reportFile), 'report file must exist: ' + reportFile)
  const xml = fs.readFileSync(reportFile, 'utf8')

  const expectContains = (snippet) =>
    assert.ok(xml.includes(snippet), 'report should contain: ' + snippet + '\n\n' + xml)
  expectContains('<testExecutions version="1">')
  // mapped to files, including the oddly formatted describe with a template literal
  expectContains('<file path="test/integration/fixtures/app/app.component.spec.js">')
  expectContains('<file path="test/integration/fixtures/lib/spaced.spec.js">')
  expectContains('<testCase name="spaced template suite handles odd formatting" duration="')
  // outcome elements
  expectContains('<testCase name="AppComponent should create the app" duration="')
  expectContains("<failure message=\"Expected 'Hello' to contain 'Hi'.\">Expected 'Hello' to contain 'Hi'.")
  expectContains('<skipped message="Skipped"/>')
  expectContains('<testCase name="AppComponent nested works nested" duration="')
  // escaping of names and stack traces
  expectContains('<testCase name="AppComponent should fail with &lt;b> &amp; &quot;quotes&quot;" duration="')
  expectContains('at UserContext.&lt;anonymous&gt;')
  // a spec outside any describe cannot be mapped and keeps its name as path
  expectContains('<file path="top level spec without describe">')

  const fileElements = xml.match(/<file /g).length
  assert.strictEqual(fileElements, 3, 'one file element per path, got ' + fileElements + '\n\n' + xml)

  fs.rmSync(outputDir, { recursive: true, force: true })
  console.log('integration test OK (karma ' + require('karma/package.json').version + ', node ' + process.version + ')')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
