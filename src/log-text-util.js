var path = require('path')
var fs = require('fs')

module.exports = {
  stripInvalidXmlCharacters: stripInvalidXmlCharacters
}

function stripInvalidXmlCharacters(loggedText) {
    return loggedText.replace(/[\0-\x08\x0B\f\x0E-\x1F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, '')
}
  