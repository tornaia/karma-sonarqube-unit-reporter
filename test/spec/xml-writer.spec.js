describe('xml-writer', function () {
  const { XMLValidator } = require('fast-xml-parser')
  const { sanitize, escapeAttribute, escapeText, serialize } = require('../../src/xml-writer.js')

  const xml = (lines) => lines.join('\n')
  const ESC = '\x1b'
  const BEL = '\x07'

  it('pretty prints nested elements the way xmlbuilder did', function () {
    const document = {
      name: 'testExecutions',
      attributes: { version: '1' },
      children: [
        {
          name: 'file',
          attributes: { path: 'src/app/app.component.spec.ts' },
          children: [
            { name: 'testCase', attributes: { name: 'creates', duration: 17 } },
            {
              name: 'testCase',
              attributes: { name: 'fails', duration: 1 },
              children: [
                { name: 'failure', attributes: { message: 'Error' }, text: 'Expected 1 to be 2.\n    at x\n' },
              ],
            },
            {
              name: 'testCase',
              attributes: { name: 'skips', duration: 1 },
              children: [{ name: 'skipped', attributes: { message: 'Skipped' } }],
            },
          ],
        },
      ],
    }
    expect(serialize(document)).toBe(
      xml([
        '<testExecutions version="1">',
        '  <file path="src/app/app.component.spec.ts">',
        '    <testCase name="creates" duration="17"/>',
        '    <testCase name="fails" duration="1">',
        '      <failure message="Error">Expected 1 to be 2.',
        '    at x',
        '</failure>',
        '    </testCase>',
        '    <testCase name="skips" duration="1">',
        '      <skipped message="Skipped"/>',
        '    </testCase>',
        '  </file>',
        '</testExecutions>',
      ])
    )
  })

  it('self-closes empty elements and skips null or undefined attributes', function () {
    expect(serialize({ name: 'testExecutions', attributes: { version: '1' } })).toBe('<testExecutions version="1"/>')
    expect(serialize({ name: 'a', attributes: { x: null, y: undefined, z: 0 }, children: [] })).toBe('<a z="0"/>')
    expect(serialize({ name: 'a', text: '' })).toBe('<a/>')
  })

  it('escapes attribute values like xmlbuilder did', function () {
    expect(escapeAttribute('a & b < c > d "e" \t\n\r')).toBe('a &amp; b &lt; c > d &quot;e&quot; &#x9;&#xA;&#xD;')
    expect(escapeAttribute(42)).toBe('42')
    expect(escapeAttribute(null)).toBe('')
  })

  it('escapes text content like xmlbuilder did', function () {
    expect(escapeText('a & b < c > d "e" \t\n\r')).toBe('a &amp; b &lt; c &gt; d "e" \t\n&#xD;')
  })

  it('strips ANSI escape sequences that colored reporters add', function () {
    expect(sanitize('Expected ' + ESC + '[31mfalse' + ESC + '[39m to be ' + ESC + '[1;32mtruthy' + ESC + '[0m.')).toBe(
      'Expected false to be truthy.'
    )
    expect(sanitize(ESC + ']8;;https://example.com' + BEL + 'link' + ESC + ']8;;' + ESC + '\\')).toBe('link')
    expect(sanitize('cursor ' + ESC + '[2K' + ESC + '[1A done')).toBe('cursor  done')
  })

  it('strips characters that are illegal in XML 1.0 and keeps everything else', function () {
    expect(sanitize('a\x00b\x01c\x08d\x0Be\x0Cf\x0Eg\x1Fh' + '\u{FFFE}' + 'i' + '\u{FFFF}' + 'j')).toBe('abcdefghij')
    expect(sanitize('tab\tlf\ncr\r')).toBe('tab\tlf\ncr\r')
    expect(sanitize('árvíztűrő 😀 \x7F \u{80} \u{E000} \u{FFFD}')).toBe('árvíztűrő 😀 \x7F \u{80} \u{E000} \u{FFFD}')
    // unpaired surrogate halves
    expect(sanitize('a\u{D83D}b')).toBe('ab')
    expect(sanitize('a\u{DE00}b')).toBe('ab')
    expect(sanitize('\u{D83D}\u{DE00}')).toBe('😀')
  })

  it('produces well-formed XML for hostile content', function () {
    const nasty = 'a<b>&"\' ' + ESC + '[31m]]>\u{D83D}\t\n\r\u{FFFF}\x00'
    const output = serialize({
      name: 'root',
      attributes: { attr: nasty },
      children: [{ name: 'child', attributes: { attr: nasty }, text: nasty }],
    })
    expect(XMLValidator.validate(output)).toBe(true)
    expect(output).not.toContain(ESC)
    expect(output).not.toContain('\x00')
    expect(output).toContain("a&lt;b>&amp;&quot;' ]]>")
    expect(output).toContain('>a&lt;b&gt;&amp;"\' ]]&gt;')
  })
})
