var path = require('path')
var fs = require('fs')
var glob = require('glob')

module.exports = {
  getFilesForDescriptions: getFilesForDescriptions,
  globFilesForDescriptions: globFilesForDescriptions
}

function getFilesForDescriptions (startPaths, filter) {
  var result = {}

  startPaths.forEach(function (startPathItem) {
    findFilesInDir(startPathItem, filter).forEach(function (file) {
      insertDescriptionsForFile(result, file, '')
    })
  })

  return result
}

function globFilesForDescriptions (filesGlob, basePath) {
  var result = {}

  glob.sync(path.join(basePath, filesGlob)).forEach(function (file) {
    insertDescriptionsForFile(result, file, basePath)
  })

  return result
}

function insertDescriptionsForFile (descriptions, file, basePath) {
  try {
    var fileText = fs.readFileSync(file, 'utf8')
    var position = 0
    file = path.relative(basePath, file)
    while (position !== -1) {
      position = fileText.indexOf('describe(')
      if (position !== -1) {
        var delimeter = fileText[position + 9]
        var descriptionEnd = fileText.indexOf(delimeter, position + 10) + 1
        var describe = fileText.substring(position + 10, descriptionEnd - 1)
        describe = describe.replace(/\\\\/g, '/')
        descriptions[describe] = file.replace(/\\\\/g, '/').replace(/\\/g, '/')
        position = 0
        fileText = fileText.substring(descriptionEnd)
      }
      console.log('-- describe: ' + describe + ' -> file: ' + file)
    }
  } catch (e) {
    console.log('Error:', e.stack)
  }
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
      if (filename !== 'node_modules') {
        results = results.concat(findFilesInDir(filename, filter))
      }
    } else if (filename.endsWith(filter)) {
      results.push(filename)
    }
  }
  return results
}
