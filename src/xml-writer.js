'use strict'

// Minimal XML serializer, enough for the SonarQube generic test execution
// report. The output format (pretty printed with two spaces, self-closing
// empty elements, text inline, no XML declaration, no trailing newline) is
// exactly what xmlbuilder produced for this reporter before, so existing
// reports do not change.

// Characters that are not allowed anywhere in an XML 1.0 document: control
// characters other than tab/LF/CR, the two non-characters U+FFFE/U+FFFF, and
// unpaired surrogate halves (with the u flag a proper surrogate pair is one
// code point, so the range only matches lone halves).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const ILLEGAL_XML_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\u{FFFE}\u{FFFF}\u{D800}-\u{DFFF}]/gu

// ANSI escape sequences as emitted by colored reporters: CSI sequences such
// as ESC[31m and OSC sequences (terminal hyperlinks, titles) terminated by
// BEL or ESC\ .
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const ANSI_ESCAPES = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\x5c)/g

/**
 * Turns any value into a string that can be placed in an XML document.
 * @param {*} value
 * @returns {string}
 */
function sanitize(value) {
  const text = value == null ? '' : String(value)
  return text.replace(ANSI_ESCAPES, '').replace(ILLEGAL_XML_CHARS, '')
}

function escapeAttribute(value) {
  return sanitize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;')
}

function escapeText(value) {
  return sanitize(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;')
}

/**
 * @typedef {object} Element
 * @property {string} name tag name
 * @property {Object<string, *>} [attributes] attributes; null and undefined values are skipped
 * @property {Element[]} [children] child elements
 * @property {string} [text] text content, used when there are no children
 */

/**
 * Serializes an element tree.
 * @param {Element} element
 * @param {string} [indent] current indentation
 * @returns {string}
 */
function serialize(element, indent) {
  indent = indent || ''
  const attributes = element.attributes || {}
  const attributeText = Object.keys(attributes)
    .filter((name) => attributes[name] != null)
    .map((name) => ' ' + name + '="' + escapeAttribute(attributes[name]) + '"')
    .join('')
  const open = indent + '<' + element.name + attributeText
  const children = element.children || []

  if (children.length > 0) {
    const inner = children.map((child) => serialize(child, indent + '  ')).join('\n')
    return open + '>\n' + inner + '\n' + indent + '</' + element.name + '>'
  }
  if (element.text != null && element.text !== '') {
    return open + '>' + escapeText(element.text) + '</' + element.name + '>'
  }
  return open + '/>'
}

module.exports = {
  sanitize,
  escapeAttribute,
  escapeText,
  serialize,
}
