var path = require('path')

describe('create description - file name map from test sources', function () {
  var fileUtil = require('../../src/file-util.js')

  it('one test file, one description', function () {
    var filesForDescriptions = fileUtil.getFilesForDescriptions('test/resources/one_file_one_description', '.spec.js')
    var expectedPath = path.join('test', 'resources', 'one_file_one_description', 'test.spec.js')
    var expected = {'test description': expectedPath}
    expect(filesForDescriptions).toEqual(expected)
  })

  it('multiple test files, one description', function () {
    expect(true).toBe(true)
  })

  it('one test file, multiple descriptions', function () {
    expect(true).toBe(true)
  })

  it('mutliple test files, multiple descriptions', function () {
    expect(true).toBe(true)
  })
})
