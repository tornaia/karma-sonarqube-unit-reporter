/* eslint-disable */
// Fixture for the describe parser. Deliberately odd formatting, do not "fix".
const SOME_CONST = 'a constant, not resolvable'

describe (
  'spaced out',
  function () {
    describe('nested inside', function () {
      it('does nothing', function () {})
    })
  }
)

describe("double quoted", function () {})
describe(`template literal`, function () {})
describe('it\'s escaped', function () {})
describe("tab\tand \"quote\"", function () {})
describe.only('only block', function () {})
describe.skip('skipped block', function () {})
fdescribe('focused block', function () {})
xdescribe('excluded block', function () {})
context('context block', function () {})
suite('suite block', function () {})

describe(SOME_CONST, function () {})
describe('concatenated ' + SOME_CONST, function () {})
undescribe('not a describe', function () {})
my.describe('member call', function () {})
describe(
  'multi line' +
    ' concatenation',
  function () {}
)
describe('trailing arguments allowed', function () {}, 123)
