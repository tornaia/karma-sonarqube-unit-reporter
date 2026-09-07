// Deliberately odd formatting for the describe parser, do not "fix".
describe (
  `spaced template suite`,
  function () {
    it('handles odd formatting', function () {
      expect(2).toBe(2)
    })
  }
)

it('top level spec without describe', function () {
  expect(3).toBe(3)
})
