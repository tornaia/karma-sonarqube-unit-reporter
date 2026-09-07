'use strict'

const path = require('path')
const fs = require('fs')

// Directories that are never worth scanning for test files.
const SKIPPED_DIRECTORIES = ['node_modules', '.git']

// Used when no Karma logger is handed in, e.g. when the module is used directly
// from a karma.conf.js as some users do.
const consoleLogger = {
  debug: function () {},
  info: function () {
    console.log.apply(console, arguments)
  },
  warn: function () {
    console.warn.apply(console, arguments)
  },
  error: function () {
    console.error.apply(console, arguments)
  },
}

module.exports = {
  getFilesForDescriptions,
  findFilesInDir,
  parseDescriptions,
}

/**
 * Scans the given directories for test files and maps every `describe(...)`
 * name found in them to the file that contains it.
 *
 * @param {string|string[]} startPaths directories (or single files) to scan
 * @param {RegExp|string} filter which files count as test files, see findFilesInDir
 * @param {{log?: object}} [options] `log` is a Karma logger (debug/info/warn/error)
 * @returns {Object<string, string>} description -> file path with forward slashes.
 *   The object has no prototype, so any description name is safe as a key.
 */
function getFilesForDescriptions(startPaths, filter, options) {
  const log = (options && options.log) || consoleLogger
  const descriptions = Object.create(null)
  const paths = Array.isArray(startPaths) ? startPaths : [startPaths]

  paths.forEach(function (startPath) {
    findFilesInDir(startPath, filter, log).forEach(function (file) {
      let text
      try {
        text = fs.readFileSync(file, 'utf8')
      } catch (e) {
        log.warn('Cannot read test file "%s": %s', file, e.message)
        return
      }
      const normalizedFile = file.replace(/\\/g, '/')
      parseDescriptions(text).forEach(function (description) {
        descriptions[description] = normalizedFile
      })
    })
  })

  return descriptions
}

/**
 * Extracts the names of the `describe(...)` blocks in a test file source.
 *
 * @param {string} text test file source
 * @returns {string[]} description names in source order
 */
function parseDescriptions(text) {
  const found = []
  let fileText = text
  let position = 0
  while (position !== -1) {
    position = fileText.indexOf('describe(')
    if (position !== -1) {
      let delimiter = ' '
      let lenToDelimiter = 8
      while (delimiter === ' ') {
        lenToDelimiter += 1
        delimiter = fileText[position + lenToDelimiter]
      }
      const descriptionEnd = fileText.indexOf(delimiter, position + lenToDelimiter + 1) + 1
      const describe = fileText.substring(position + lenToDelimiter + 1, descriptionEnd - 1)
      found.push(describe.replace(/\\\\/g, '/'))
      fileText = fileText.substring(descriptionEnd)
    }
  }
  return found
}

/**
 * Recursively lists the files under `startPath` whose path matches `filter`.
 * `node_modules` and `.git` directories are skipped at any depth, symbolic
 * links are not followed. A missing path yields an empty list and a warning
 * instead of an error.
 *
 * @param {string} startPath directory to scan (a single file is accepted too)
 * @param {RegExp|string} filter a RegExp tested against the path, or a string
 *   pattern: `.spec.js` matches by suffix, `*` matches within one path segment,
 *   `**` matches across segments, `/` matches either path separator
 * @param {object} [log] Karma logger
 * @returns {string[]} matching file paths, joined from `startPath`
 */
function findFilesInDir(startPath, filter, log) {
  log = log || consoleLogger
  const regex = filter instanceof RegExp ? filter : patternToRegExp(filter)
  const matches = function (file) {
    return regex.test(file) || regex.test(file.replace(/\\/g, '/'))
  }

  let startStat
  try {
    startStat = fs.statSync(startPath)
  } catch {
    log.warn('Test source path not found, no test files will be mapped from it: "%s"', startPath)
    return []
  }
  if (startStat.isFile()) {
    return matches(startPath) ? [startPath] : []
  }

  const results = []
  walk(startPath)
  return results

  function walk(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir).sort()
    } catch (e) {
      log.warn('Cannot list directory "%s": %s', dir, e.message)
      return
    }
    entries.forEach(function (name) {
      const file = path.join(dir, name)
      let stat
      try {
        stat = fs.lstatSync(file)
      } catch {
        return
      }
      if (stat.isDirectory()) {
        if (SKIPPED_DIRECTORIES.indexOf(name) === -1) {
          walk(file)
        }
      } else if (stat.isFile() && matches(file)) {
        results.push(file)
      }
    })
  }
}

function patternToRegExp(pattern) {
  const source =
    String(pattern)
      // \ or / in the pattern matches either separator
      .replace(/[\\/]/g, '[\\\\/]')
      // a literal dot
      .replace(/\./g, '\\.')
      // a single * matches anything but a path separator
      .replace(/(?<!\*)\*(?!\*)/g, '[^\\\\/]*')
      // ** matches across path separators
      .replace(/\*\*/g, '.*') + '$'
  return new RegExp(source)
}
