describe('create description - file name map from test sources', function () {
  var fileUtil = require('../src/file-util.js')

  it('one test file, one description', function () {
    var filesForDescriptions = fileUtil.getFilesForDescriptions('resources/one_file_one_description', '.spec.js')
    var expected = {'test description': 'resources/one_file_one_description.spec.js'}
    expect(filesForDescriptions).toBe(expected)
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
