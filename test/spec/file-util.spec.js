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
    var filesForDescriptions = fileUtil.getFilesForDescriptions('test/resources/multiple_files_one_description', '.spec.js')
    var firstExpectedPath = path.join('test', 'resources', 'multiple_files_one_description', 'first_test.spec.js')
    var secondExpectedPath = path.join('test', 'resources', 'multiple_files_one_description', 'second_test.spec.js')
    var expected = {'first test description': firstExpectedPath, 'second test description': secondExpectedPath}
    expect(filesForDescriptions).toEqual(expected)
  })

  it('one test file, multiple descriptions', function () {
    var filesForDescriptions = fileUtil.getFilesForDescriptions('test/resources/one_file_multiple_descriptions', '.spec.js')
    var expectedPath = path.join('test', 'resources', 'one_file_multiple_descriptions', 'test.spec.js')
    var expected = {'test description': expectedPath, 'another test description': expectedPath}
    expect(filesForDescriptions).toEqual(expected)
  })

  it('mutliple test files, multiple descriptions', function () {
    var filesForDescriptions = fileUtil.getFilesForDescriptions('test/resources/multiple_files_multiple_descriptions', '.spec.js')
    var firstExpectedPath = path.join('test', 'resources', 'multiple_files_multiple_descriptions', 'first_test.spec.js')
    var secondExpectedPath = path.join('test', 'resources', 'multiple_files_multiple_descriptions', 'second_test.spec.js')
    var expected = {
      'first test first description': firstExpectedPath,
      'first test second description': firstExpectedPath,
      'second test first description': secondExpectedPath,
      'second test second description': secondExpectedPath
    }
    expect(filesForDescriptions).toEqual(expected)
  })
})
