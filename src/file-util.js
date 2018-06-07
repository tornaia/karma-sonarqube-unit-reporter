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
      let length = 0;
      while (position !== -1) {
        [position, length] = getPostion(fileText);
        if (position !== -1) {
          var delimeter = fileText[position + length]
          var descriptionEnd = fileText.indexOf(delimeter, position + length + 1) + 1
          var describe = fileText.substring(position + length + 1, descriptionEnd - 1)
          describe = describe.replace(/\\\\/g, '/')
          item = item.replace(/\\\\/g, '/').replace(/\\/g, '/')
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

function getPostion(fileText) {
  const testList = [
    /describe.?\w* *\(/,
    /suite.?\w* *\(/
  ];
  for (let i = 0; i < testList.length; i++) {
    const regex = new RegExp(testList[i]);
    const match = regex.exec(fileText);
    if(match) {
      return [match.index, match[0].length];
    }
  }
  return [-1, 0];
}
