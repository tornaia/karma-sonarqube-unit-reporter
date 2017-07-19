var path = require('path')
var fs = require('fs')

module.exports = {
  getFilesForDescriptions: getFilesForDescriptions
}

function getFilesForDescriptions (startPath, filter) {
  var ret = {}
  var files = findFilesInDir(startPath, filter)
  files.forEach(findDescriptionInFile)

  function findDescriptionInFile (item, index) {
    try {
      var fileText = fs.readFileSync(item, 'utf8')
      var position = 0
      while (position !== -1) {
        position = fileText.indexOf('describe(')
        if (position !== -1) {
          var delimeter = fileText[position + 9]
          var descriptionEnd = fileText.indexOf(delimeter, position + 10) + 1
          var describe = fileText.substring(position + 10, descriptionEnd - 1)
          describe = describe.replace(/\\\\/g, '/')
          item = item.replace(/\\\\/g, '/')
          ret[describe] = item
          position = 0
          fileText = fileText.substring(descriptionEnd)
        }
        console.log('-- describe: ' + describe + ' -> file: ' + item)
      }
    } catch (e) {
      console.log('Error:', e.stack)
    }
  }

  return ret
}

function findFilesInDir (startPath, filter) {
  var results = []

  if (!fs.existsSync(startPath)) {
    console.log('Source directory not found. ', startPath)
    return
  }

  var files = fs.readdirSync(startPath)
  for (var i = 0; i < files.length; i++) {
    var filename = path.join(startPath, files[i])
    var stat = fs.lstatSync(filename)
    if (stat.isDirectory()) {
      results = results.concat(findFilesInDir(filename, filter))
    } else if (filename.search(filter) >= 0) {
      results.push(filename)
    }
  }
  return results
}
