describe('testFilePattern variants', function () {
  const fileUtil = require('../../src/file-util.js')
  const silent = { debug() {}, info() {}, warn() {}, error() {} }

  const one = 'test/resources/one_file_one_description'
  const multiple = 'test/resources/multiple_files_one_description'

  function files(startPaths, filter) {
    return startPaths.reduce(function (all, startPath) {
      return all.concat(fileUtil.findFilesInDir(startPath, filter, silent).map((f) => f.replace(/\\/g, '/')))
    }, [])
  }

  it('accepts an array of string patterns', function () {
    // string patterns match by suffix, so 'test.spec.js' alone would also match 'first_test.spec.js'
    expect(files([one, multiple], ['one_file_one_description/test.spec.js', 'first_test.spec.js'])).toEqual([
      one + '/test.spec.js',
      multiple + '/first_test.spec.js',
    ])
  })

  it('accepts an array mixing regular expressions and strings', function () {
    expect(files([multiple], [/first_test\.spec\.js$/, 'second_test.spec.js'])).toEqual([
      multiple + '/first_test.spec.js',
      multiple + '/second_test.spec.js',
    ])
  })

  it('matches nothing for an empty array', function () {
    expect(files([one, multiple], [])).toEqual([])
    expect(fileUtil.getFilesForDescriptions([one], [], { log: silent })).toEqual({})
  })

  it('tests regular expressions against the forward slash form of the path too', function () {
    expect(files(['test/resources'], /^test\/resources\/one_file_one_description\/test\.spec\.js$/)).toEqual([
      one + '/test.spec.js',
    ])
  })

  it('rejects patterns that are neither strings nor regular expressions', function () {
    expect(() => files([one], 42)).toThrowError(TypeError, /testFilePattern/)
    expect(() => files([one], ['.spec.js', null])).toThrowError(TypeError, /testFilePattern/)
  })

  it('still supports the historical string forms', function () {
    expect(files([one], '.spec.js')).toEqual([one + '/test.spec.js'])
    expect(files([one], '(.spec.ts|.spec.js)')).toEqual([one + '/test.spec.js'])
    expect(files(['test/resources'], 'one_file_one*/*.spec.*')).toEqual([one + '/test.spec.js'])
    expect(files(['test/resources'], '**one_file_one*/*.spec.js')).toEqual([one + '/test.spec.js'])
  })
})
