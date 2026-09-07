describe('describe parser', function () {
  const fs = require('fs')
  const path = require('path')
  const fileUtil = require('../../src/file-util.js')
  const { parseDescriptions } = fileUtil

  const fixtures = 'test/resources/parser_edge_cases'
  const silent = { debug() {}, info() {}, warn() {}, error() {} }

  it('exports the default suite functions', function () {
    expect(fileUtil.DEFAULT_DESCRIBE_FUNCTIONS).toEqual([
      'describe',
      'fdescribe',
      'xdescribe',
      'ddescribe',
      'context',
      'suite',
    ])
  })

  it('finds names regardless of whitespace, quotes, modifiers and nesting', function () {
    const text = fs.readFileSync(path.join(fixtures, 'spacing.spec.js'), 'utf8')
    expect(parseDescriptions(text)).toEqual([
      'spaced out',
      'nested inside',
      'double quoted',
      'template literal',
      "it's escaped",
      'tab\tand "quote"',
      'only block',
      'skipped block',
      'focused block',
      'excluded block',
      'context block',
      'suite block',
      'member call',
      'trailing arguments allowed',
    ])
  })

  it('ignores names that are not a single string literal', function () {
    expect(parseDescriptions('describe(SOME_CONST, function () {})')).toEqual([])
    expect(parseDescriptions("describe('a' + b, function () {})")).toEqual([])
    expect(parseDescriptions("describe(\n  'a' +\n  'b',\n  fn)")).toEqual([])
    expect(parseDescriptions("describe(fn('a'), function () {})")).toEqual([])
  })

  it('does not hang or throw on unfinished input', function () {
    expect(parseDescriptions('describe(')).toEqual([])
    expect(parseDescriptions("describe('unterminated")).toEqual([])
    expect(parseDescriptions('describe(foo)')).toEqual([])
    expect(parseDescriptions('')).toEqual([])
  })

  it('resolves escape sequences like the JavaScript engine does', function () {
    expect(parseDescriptions("describe('new\\nline \\u00e9 \\x41 \\u{1F600} \\\\ \\$ \\q', fn)")).toEqual([
      'new\nline é A 😀 \\ $ q',
    ])
    expect(parseDescriptions("describe('line \\\ncontinuation', fn)")).toEqual(['line continuation'])
    expect(parseDescriptions('describe(`back\\`tick`, fn)')).toEqual(['back`tick'])
  })

  it('keeps template literal placeholders as written', function () {
    expect(parseDescriptions('describe(`suite ${name} here`, fn)')).toEqual(['suite ${name} here'])
  })

  it('only looks for the configured functions when describeFunctions is given', function () {
    const text = fs.readFileSync(path.join(fixtures, 'qunit.spec.js'), 'utf8')
    expect(parseDescriptions(text)).toEqual([])
    expect(parseDescriptions(text, ['module'])).toEqual(['qunit module', 'bare module'])
    expect(parseDescriptions(text, 'module')).toEqual(['qunit module', 'bare module'])
    expect(parseDescriptions("describe('d', fn); suite('s', fn)", ['describe'])).toEqual(['d'])
  })

  it('falls back to the defaults for an empty or invalid describeFunctions value', function () {
    expect(parseDescriptions("describe('d', fn)", [])).toEqual(['d'])
    expect(parseDescriptions("describe('d', fn)", [42, 'not an identifier(', ''])).toEqual(['d'])
  })

  it('maps QUnit modules to files through getFilesForDescriptions', function () {
    const file = fixtures + '/qunit.spec.js'
    expect(fileUtil.getFilesForDescriptions([fixtures], 'qunit.spec.js', { log: silent })).toEqual({})
    expect(
      fileUtil.getFilesForDescriptions([fixtures], 'qunit.spec.js', { log: silent, describeFunctions: ['module'] })
    ).toEqual({ 'qunit module': file, 'bare module': file })
  })

  it('stores Windows path descriptions with both separators', function () {
    const map = fileUtil.getFilesForDescriptions([fixtures], 'windows_path.spec.js', { log: silent })
    expect(map).toEqual({
      'src\\app\\legacy.spec.js': fixtures + '/windows_path.spec.js',
      'src/app/legacy.spec.js': fixtures + '/windows_path.spec.js',
    })
  })
})
