/* eslint-disable */
// Fixture for the describe parser: QUnit style suites.
QUnit.module('qunit module', function () {
  QUnit.test('adds', function (assert) {
    assert.ok(true)
  })
})

module('bare module', {
  beforeEach: function () {},
})
