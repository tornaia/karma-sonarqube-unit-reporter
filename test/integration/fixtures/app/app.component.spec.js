describe('AppComponent', function () {
  it('should create the app', function () {
    expect(true).toBe(true)
  })

  it('should fail with <b> & "quotes"', function () {
    expect('Hello').toContain('Hi')
  })

  xit('is pending', function () {})

  describe('nested', function () {
    it('works nested', function () {
      expect(1).toBe(1)
    })
  })
})
