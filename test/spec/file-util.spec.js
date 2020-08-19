describe('create description - file name map from test sources', function() {
  var fileUtil = require('../../src/file-util.js')

  it('one test file, one description', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test/resources/one_file_one_description'],
      '.spec.js'
    )
    var expectedPath = 'test/resources/one_file_one_description/test.spec.js'
    var expected = { 'test description': expectedPath }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('one test file, one description, default filter', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test/resources/one_file_one_description'],
      '(.spec.ts|.spec.js)'
    )
    var expected = { 'test description': 'test/resources/one_file_one_description/test.spec.js' }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('one test file, one description, default filter regexp', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test/resources/one_file_one_description'],
      /(\.spec\.ts|\.spec.js)/
    )
    var expected = { 'test description': 'test/resources/one_file_one_description/test.spec.js' }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('one test file, one description, wildcard', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test'],
      'test/resources/one_file_one*/*.spec.*'
    )
    var expectedPath = 'test/resources/one_file_one_description/test.spec.js'
    var expected = { 'test description': expectedPath }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('one test file, one description, double wildcard', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test'],
      'test/**one_file_one*/*.spec.js'
    )
    var expected = { 'test description': 'test/resources/one_file_one_description/test.spec.js' }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('multiple test files, one description', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test/resources/multiple_files_one_description'],
      '.spec.js'
    )
    var firstExpectedPath =
      'test/resources/multiple_files_one_description/first_test.spec.js'
    var secondExpectedPath =
      'test/resources/multiple_files_one_description/second_test.spec.js'
    var expected = {
      'first test description': firstExpectedPath,
      'second test description': secondExpectedPath,
    }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('one test file, multiple descriptions', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test/resources/one_file_multiple_descriptions'],
      '.spec.js'
    )
    var expectedPath =
      'test/resources/one_file_multiple_descriptions/test.spec.js'
    var expected = {
      'test description': expectedPath,
      'another test description': expectedPath,
    }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('mutliple test files, multiple descriptions', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      ['test/resources/multiple_files_multiple_descriptions'],
      '.spec.js'
    )
    var firstExpectedPath =
      'test/resources/multiple_files_multiple_descriptions/first_test.spec.js'
    var secondExpectedPath =
      'test/resources/multiple_files_multiple_descriptions/second_test.spec.js'
    var expected = {
      'first test first description': firstExpectedPath,
      'first test second description': firstExpectedPath,
      'second test first description': secondExpectedPath,
      'second test second description': secondExpectedPath,
    }
    expect(filesForDescriptions).toEqual(expected)
  })

  it('two folders, two test files', function() {
    var filesForDescriptions = fileUtil.getFilesForDescriptions(
      [
        'test/resources/one_file_one_description',
        'test/resources/multiple_files_one_description',
      ],
      '.spec.js'
    )
    var firstExpectedPath =
      'test/resources/one_file_one_description/test.spec.js'
    var secondExpectedPath =
      'test/resources/multiple_files_one_description/first_test.spec.js'
    var thirdExpectedPath =
      'test/resources/multiple_files_one_description/second_test.spec.js'
    var expected = {
      'test description': firstExpectedPath,
      'first test description': secondExpectedPath,
      'second test description': thirdExpectedPath,
    }
    expect(filesForDescriptions).toEqual(expected)
  })
})
