'use strict'

/**
 * remark-macro
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const dedent = require('dedent')
const unified = require('unified')
const markdown = require('remark-parse')
const html = require('remark-html')
const Macroable = require('..')

const unifiedStream = () => unified().use(markdown)

const exec = function (content, stream) {
  return new Promise((resolve, reject) => {
    stream.process(content, (error, file) => {
      if (error) {
        return reject(error)
      }
      resolve(file)
    })
  })
}

test.group('Macroable', (group) => {
  test('adding a macro without defining the function should throw exception', async (assert) => {
    const macroable = Macroable()
    const fn = () => macroable.addMacro('alert')
    assert.throw(fn, 'addMacro expects 2nd argument to be a function')
  })

  test('redefining the same macro should throw an exception', async (assert) => {
    const macroable = Macroable()
    macroable.addMacro('hello', function () {})
    const fn = () => macroable.addMacro('hello', function () {})
    assert.throw(fn, 'Cannot redefine the macro hello. One already exists')
  })

  test('call the fn when macro opening closing tags are detected', async (assert) => {
    const macroable = Macroable()
    assert.plan(4)

    macroable.addMacro('alert', function (content, props, { eat }) {
      assert.deepEqual(props, {})
      assert.equal(eat.now().line, 3)
      assert.equal(content, 'Hey dude')
    })

    const template = dedent`
    Hello world!

    [alert]
    Hey dude
    [/alert]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>\n
    `)
  })

  test('work fine with multiple macros', async (assert) => {
    const macroable = Macroable()
    assert.plan(7)

    macroable.addMacro('alert', function (content, props, { eat }) {
      assert.deepEqual(props, {})
      assert.equal(eat.now().line, 3)
      assert.equal(content, 'Hey dude')
    })

    macroable.addMacro('note', function (content, props, { eat }) {
      assert.deepEqual(props, {})
      assert.equal(eat.now().line, 7)
      assert.equal(content, 'Hey dude')
    })

    const template = dedent`
    Hello world!

    [alert]
    Hey dude
    [/alert]

    [note]
    Hey dude
    [/note]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>\n
    `)
  })

  test('ignore macro when not defined', async (assert) => {
    const macroable = Macroable()
    assert.plan(4)

    macroable.addMacro('note', function (content, props, { eat }) {
      assert.deepEqual(props, {})
      assert.equal(eat.now().line, 7)
      assert.equal(content, 'Hey dude')
    })

    const template = dedent`
    Hello world!

    [alert]
    Hey dude
    [/alert]

    [note]
    Hey dude
    [/note]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>
      <p>[alert]
      Hey dude
      [/alert]</p>\n
    `)
  })

  test('replace content when macro ast node', async (assert) => {
    const macroable = Macroable()
    macroable.addMacro('note', function (content, props, { eat }) {
      return {
        type: 'NoteNode',
        data: {
          hName: 'p',
          hChildren: [{ type: 'text', value: content }]
        }
      }
    })

    const template = dedent`
    Hello world!

    [note]
    Hey dude
    [/note]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>
      <p>Hey dude</p>\n
    `)
  })

  test('return node with badnode when no close tags are found', async (assert) => {
    const macroable = Macroable()
    macroable.addMacro('note', function (content, props, { eat }) {
      return {
        type: 'NoteNode',
        data: {
          hName: 'p',
          hChildren: [{ type: 'text', value: content }]
        }
      }
    })

    const template = dedent`
    Hello world!

    [note]
    Hey dude
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>
      <div>Unclosed macro: note</div>
      <p>Hey dude</p>\n
    `)
  })

  test('pass props to the macro', async (assert) => {
    const macroable = Macroable()
    assert.plan(2)

    macroable.addMacro('note', function (content, props, { eat }) {
      assert.deepEqual(props, { title: ['hello world'], color: ['grey'] })
    })

    const template = dedent`
    Hello world!

    [note title=hello world, color=grey]
    Hey dude
    [/note]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>\n
    `)
  })
})
