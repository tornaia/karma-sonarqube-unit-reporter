var path = require('path')
var fs = require('fs')

module.exports = {
  getFilesForDescriptions: getFilesForDescriptions
}

function getFilesForDescriptions (startPaths, filter) {
  var ret = {}

  startPaths.forEach(function (startPathItem) {
    var files = findFilesInDir(startPathItem, filter)
    files.forEach(findDescriptionInFile)
  })

  function findDescriptionInFile (item, index) {
    try {
      var fileText = fs.readFileSync(item, 'utf8')
      var position = 0
      while (position !== -1) {
        position = fileText.indexOf('describe(')
        if (position !== -1) {
          var delimeter = ' '
          var lenToDelimiter = 8
          while (delimeter === ' ') {
            lenToDelimiter += 1
            delimeter = fileText[position + lenToDelimiter]
          }
          var descriptionEnd = fileText.indexOf(delimeter, position + lenToDelimiter + 1) + 1
          var describe = fileText.substring(position + lenToDelimiter + 1, descriptionEnd - 1)
          describe = describe.replace(/\\\\/g, '/')
          item = item.replace(/\\\\/g, '/').replace(/\\/g, '/')
          ret[describe] = item
          position = 0
          fileText = fileText.substring(descriptionEnd)
        }
      }
    } catch (e) {
      console.log('Error:', e.stack)
    }
  }

  return ret
}

function findFilesInDir (startPath, filter) {
  var results = []
  var fileFilterRegex
  if (filter instanceof RegExp) {
    fileFilterRegex = filter
  } else {
    var fileFilter = filter
      // Replace \ or / with [\\/]
      .replace(/[\\/]/g, '[\\\\/]')
      // Replace . with \. for regex
      .replace(/\./g, '\\.')
      // Replace single * with any char except path seperator
      .replace(/(?<!\*)\*(?!\*)/g, '[^\\\\/]*')
      // Replace double * with anychar
      .replace(/\*\*/g, '.*') + '$'
    fileFilterRegex = new RegExp(fileFilter)
  }

  if (!fs.existsSync(startPath)) {
    console.log('Source directory not found. ', startPath)
    return
  }

  var files = fs.readdirSync(startPath)
  for (var i = 0; i < files.length; i++) {
    var filename = path.join(startPath, files[i])
    var stat = fs.lstatSync(filename)
    if (stat.isDirectory()) {
      if (filename !== 'node_modules') {
        results = results.concat(findFilesInDir(filename, filter))
      }
    } else if (fileFilterRegex.test(filename)) {
      results.push(filename)
    }
  }
  return results
}
