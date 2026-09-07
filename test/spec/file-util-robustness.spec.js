describe('file-util robustness', function () {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const fileUtil = require('../../src/file-util.js')

  let tempDir
  let log

  function writeTree(files) {
    Object.keys(files).forEach(function (relative) {
      const file = path.join(tempDir, relative)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, files[relative])
    })
  }

  function slashes(file) {
    return file.replace(/\\/g, '/')
  }

  function fakeLogger() {
    const entries = []
    const push = (level) =>
      function () {
        entries.push([level].concat(Array.prototype.slice.call(arguments)))
      }
    return { entries, debug: push('debug'), info: push('info'), warn: push('warn'), error: push('error') }
  }

  beforeEach(function () {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ksur-file-util-'))
    log = fakeLogger()
  })

  afterEach(function () {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns an empty map and warns when a test path does not exist', function () {
    spyOn(console, 'log')
    spyOn(console, 'warn')
    const missing = path.join(tempDir, 'does', 'not', 'exist')
    const map = fileUtil.getFilesForDescriptions([missing], '.spec.js', { log })
    expect(map).toEqual({})
    expect(log.entries.length).toBe(1)
    expect(log.entries[0][0]).toBe('warn')
    expect(log.entries[0].join(' ')).toContain(missing)
    expect(console.log).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('falls back to the console when no logger is given', function () {
    spyOn(console, 'warn')
    const map = fileUtil.getFilesForDescriptions([path.join(tempDir, 'missing')], '.spec.js')
    expect(map).toEqual({})
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('accepts a single path string instead of an array', function () {
    writeTree({ 'a.spec.js': "describe('single string path', function () {})" })
    const map = fileUtil.getFilesForDescriptions(tempDir, '.spec.js', { log })
    expect(map).toEqual({ 'single string path': slashes(path.join(tempDir, 'a.spec.js')) })
  })

  it('accepts a single file as start path', function () {
    writeTree({
      'a.spec.js': "describe('from file', function () {})",
      'b.spec.js': "describe('other', function () {})",
    })
    const file = path.join(tempDir, 'a.spec.js')
    const map = fileUtil.getFilesForDescriptions([file], '.spec.js', { log })
    expect(map).toEqual({ 'from file': slashes(file) })
    expect(fileUtil.getFilesForDescriptions([file], '.other.js', { log })).toEqual({})
  })

  it('skips node_modules and dot directories at any depth', function () {
    writeTree({
      'src/real.spec.js': "describe('real', function () {})",
      'src/node_modules/dep/dep.spec.js': "describe('dependency', function () {})",
      'node_modules/top/top.spec.js': "describe('top level dependency', function () {})",
      '.git/hooks/hook.spec.js': "describe('git internals', function () {})",
      '.angular/cache/x.spec.js': "describe('build cache', function () {})",
      'src/.hidden/h.spec.js': "describe('hidden', function () {})",
    })
    const map = fileUtil.getFilesForDescriptions([tempDir], '.spec.js', { log })
    expect(Object.keys(map)).toEqual(['real'])
    expect(log.entries).toEqual([])
  })

  it('lists files in a deterministic (sorted) order, the last file wins for duplicated names', function () {
    writeTree({
      'b/z.spec.js': "describe('same name', function () {})",
      'a/y.spec.js': "describe('same name', function () {})",
    })
    const files = fileUtil.findFilesInDir(tempDir, '.spec.js', log)
    expect(files.map((f) => slashes(path.relative(tempDir, f)))).toEqual(['a/y.spec.js', 'b/z.spec.js'])
    const map = fileUtil.getFilesForDescriptions([tempDir], '.spec.js', { log })
    expect(map['same name']).toBe(slashes(path.join(tempDir, 'b', 'z.spec.js')))
  })

  it('is safe against description names that are Object.prototype properties', function () {
    writeTree({
      'proto.spec.js': "describe('constructor', function () {})\ndescribe('__proto__', function () {})",
    })
    const map = fileUtil.getFilesForDescriptions([tempDir], '.spec.js', { log })
    const file = slashes(path.join(tempDir, 'proto.spec.js'))
    expect(map.constructor).toBe(file)
    expect(map['__proto__']).toBe(file)
    expect(map.toString).toBeUndefined()
    expect(map.hasOwnProperty).toBeUndefined()
  })

  it('warns instead of throwing when a matched file cannot be read', function () {
    writeTree({ 'ok.spec.js': "describe('ok', function () {})" })
    // a directory whose name matches the pattern is not a file, so it is simply not listed
    fs.mkdirSync(path.join(tempDir, 'dir.spec.js'))
    const original = fs.readFileSync
    spyOn(fs, 'readFileSync').and.callFake(function (file, encoding) {
      if (String(file).endsWith('ok.spec.js')) throw new Error('EACCES simulated')
      return original.call(fs, file, encoding)
    })
    const map = fileUtil.getFilesForDescriptions([tempDir], '.spec.js', { log })
    expect(map).toEqual({})
    expect(log.entries.length).toBe(1)
    expect(log.entries[0][0]).toBe('warn')
    expect(log.entries[0].join(' ')).toContain('EACCES simulated')
  })
})
