'use strict'

const path = require('path')
const fs = require('fs')

// Directories that are never worth scanning for test files: dependencies and
// tool directories such as .git, .angular or .cache.
function isSkippedDirectory(name) {
  return name === 'node_modules' || name.charAt(0) === '.'
}

// Functions whose first string argument names a test suite: Jasmine and Mocha
// BDD (`describe`, focused/excluded variants, `context`) and Mocha TDD
// (`suite`). QUnit users can configure `module` via `describeFunctions`.
const DEFAULT_DESCRIBE_FUNCTIONS = ['describe', 'fdescribe', 'xdescribe', 'ddescribe', 'context', 'suite']

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
  DEFAULT_DESCRIBE_FUNCTIONS,
  getFilesForDescriptions,
  findFilesInDir,
  parseDescriptions,
}

/**
 * Scans the given directories for test files and maps every suite name
 * (`describe('name', ...)` and friends, see parseDescriptions) found in them to
 * the file that contains it.
 *
 * @param {string|string[]} startPaths directories (or single files) to scan
 * @param {RegExp|string|Array<RegExp|string>} filter which files count as test
 *   files, see findFilesInDir
 * @param {{log?: object, describeFunctions?: string[]}} [options] `log` is a
 *   Karma logger (debug/info/warn/error); `describeFunctions` overrides the
 *   suite functions to look for
 * @returns {Object<string, string>} description -> file path with forward slashes.
 *   Descriptions containing backslashes are also stored with forward slashes.
 *   The object has no prototype, so any description name is safe as a key.
 */
function getFilesForDescriptions(startPaths, filter, options) {
  const log = (options && options.log) || consoleLogger
  const describeFunctions = options && options.describeFunctions
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
      parseDescriptions(text, describeFunctions).forEach(function (description) {
        descriptions[description] = normalizedFile
        const withSlashes = description.replace(/\\/g, '/')
        if (withSlashes !== description) {
          descriptions[withSlashes] = normalizedFile
        }
      })
    })
  })

  return descriptions
}

/**
 * Extracts the names of the test suite blocks (`describe('name', ...)` and
 * friends) in a test file source.
 *
 * Handles any whitespace or line breaks around the parenthesis, single and
 * double quoted strings as well as template literals, escaped characters in
 * the name, and the `.only` / `.skip` modifiers. Only string literals are
 * resolved: a name built from a variable or concatenation cannot be known
 * without running the file and is ignored.
 *
 * @param {string} text test file source
 * @param {string[]} [functionNames] suite functions to look for, defaults to
 *   DEFAULT_DESCRIBE_FUNCTIONS
 * @returns {string[]} description names in source order
 */
function parseDescriptions(text, functionNames) {
  const names = normalizeDescribeFunctions(functionNames)
  const regex = new RegExp(
    // the function name must not be part of a longer identifier
    '(?<![\\w$])(?:' +
      names.map(escapeRegExp).join('|') +
      ')' +
      // describe.only( / describe.skip(
      '(?:\\.(?:only|skip))?\\s*\\(\\s*' +
      // a quoted string: escaped char or anything but the closing quote
      '([\'"`])((?:\\\\[\\s\\S]|(?!\\1)[^\\\\])*)\\1' +
      // followed by the callback or the end of the argument list
      '(?=\\s*[,)])',
    'g'
  )
  const found = []
  let match
  while ((match = regex.exec(text)) !== null) {
    found.push(unescapeStringLiteral(match[2]))
  }
  return found
}

function normalizeDescribeFunctions(functionNames) {
  const list = Array.isArray(functionNames) ? functionNames : functionNames ? [functionNames] : []
  const valid = list.filter(function (name) {
    return typeof name === 'string' && /^[\w$]+$/.test(name)
  })
  return valid.length ? valid : DEFAULT_DESCRIBE_FUNCTIONS
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Resolves the escape sequences of a JavaScript string literal body.
function unescapeStringLiteral(body) {
  return body.replace(
    /\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(\r\n|[\s\S]))/g,
    function (all, codePoint, unicode, hex, single) {
      if (codePoint) return String.fromCodePoint(parseInt(codePoint, 16))
      if (unicode) return String.fromCharCode(parseInt(unicode, 16))
      if (hex) return String.fromCharCode(parseInt(hex, 16))
      switch (single) {
        case 'n':
          return '\n'
        case 't':
          return '\t'
        case 'r':
          return '\r'
        case 'b':
          return '\b'
        case 'f':
          return '\f'
        case 'v':
          return '\v'
        case '0':
          return '\0'
        case '\n':
        case '\r\n':
        case '\r':
          // line continuation
          return ''
        default:
          return single
      }
    }
  )
}

/**
 * Recursively lists the files under `startPath` whose path matches `filter`.
 * `node_modules` and directories starting with a dot (.git, .angular, ...)
 * are skipped at any depth, symbolic links are not followed. A missing path
 * yields an empty list and a warning instead of an error.
 *
 * @param {string} startPath directory to scan (a single file is accepted too)
 * @param {RegExp|string|Array<RegExp|string>} filter a RegExp tested against
 *   the path, or a string pattern: `.spec.js` matches by suffix, `*` matches
 *   within one path segment, `**` matches across segments, `/` matches either
 *   path separator. An array matches when any of its entries does.
 * @param {object} [log] Karma logger
 * @returns {string[]} matching file paths, joined from `startPath`
 */
function findFilesInDir(startPath, filter, log) {
  log = log || consoleLogger
  const matchers = toMatchers(filter)
  const matches = function (file) {
    const withSlashes = file.replace(/\\/g, '/')
    return matchers.some(function (regex) {
      return regex.test(file) || regex.test(withSlashes)
    })
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
        if (!isSkippedDirectory(name)) {
          walk(file)
        }
      } else if (stat.isFile() && matches(file)) {
        results.push(file)
      }
    })
  }
}

// Accepts a RegExp, a string pattern or an array of those; a file matches when
// any of the matchers does. Regular expressions are tested with the native
// path and with forward slashes, so a pattern written for one platform works
// on the other.
function toMatchers(filter) {
  const list = Array.isArray(filter) ? filter : [filter]
  return list.map(function (item) {
    if (item instanceof RegExp) return item
    if (typeof item === 'string') return patternToRegExp(item)
    throw new TypeError(
      'testFilePattern must be a RegExp, a string pattern or an array of those, got: ' + JSON.stringify(item)
    )
  })
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
