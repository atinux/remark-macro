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
      assert.deepEqual(props, {
        title: ['hello world'],
        color: ['grey']
      })
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

  test('do not trim macro content', async (assert) => {
    const macroable = Macroable()
    assert.plan(2)

    macroable.addMacro('note', function (content, props, { eat }) {
      assert.equal(content, '  Hey dude')
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

  test('do not mess with anchor tags', async (assert) => {
    const macroable = Macroable()
    assert.plan(1)

    macroable.addMacro('note', function () {
      throw new Error('Never expected to be called')
    })

    const template = dedent`
    Hello world!

    [note](hello)
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <p>Hello world!</p>
      <p><a href="hello">note</a></p>\n
    `)
  })

  test('allow macros inside li', async (assert) => {
    const macroable = Macroable()
    assert.plan(1)

    macroable.addMacro('note', function (content, props, { eat }) {
      return {
        type: 'text',
        value: content
      }
    })

    const template = dedent`
    - List item

        [note]
        Hey dude
        [/note]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <ul>
      <li>
      <p>List item</p>
      Hey dude
      </li>
      </ul>\n
    `)
  })

  test('allow macros inside nested li', async (assert) => {
    const macroable = Macroable()
    assert.plan(1)

    macroable.addMacro('note', function (content, props, { eat }) {
      return {
        type: 'text',
        value: content
      }
    })

    const template = dedent`
    - List item 1
      - List item 1.1

        [note]
        Hey dude
        [/note]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))
    assert.equal(result.contents, dedent`
      <ul>
      <li>
      <p>List item 1</p>
      <ul>
      <li>
      <p>List item 1.1</p>
      Hey dude
      </li>
      </ul>
      </li>
      </ul>\n
    `)
  })

  test('allow inline macros', async (assert) => {
    const macroable = Macroable()
    assert.plan(1)

    macroable.addMacro('codepen', function (props, { eat }) {
      return {
        type: 'text',
        value: props.src
      }
    }, true)

    const template = dedent`
    Here is a pen

    [codepen src=http://facebook.com]

    Content after pen
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))

    assert.equal(result.contents, dedent`
    <p>Here is a pen</p>
    http://facebook.com
    <p>Content after pen</p>\n
    `)
  })

  test('work fine when block macro is the last line', async (assert) => {
    const macroable = Macroable()
    assert.plan(3)

    macroable.addMacro('alert', function (content, props, { eat }) {
      assert.equal(content, 'hello')
      assert.deepEqual(props, {})
    })

    const template = dedent`
    Hello world

    [alert]
    hello
    [/alert]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))

    assert.equal(result.contents, dedent`
    <p>Hello world</p>\n
    `)
  })

  test('work fine when inline macro is the last line', async (assert) => {
    const macroable = Macroable()
    assert.plan(2)

    macroable.addMacro('codepen', function (props, { eat }) {
      assert.deepEqual(props, { src: ['foo'] })
    }, true)

    const template = dedent`
    Here is a pen

    [codepen src=foo]
    `
    const result = await exec(template, unifiedStream().use(macroable.transformer).use(html))

    assert.equal(result.contents, dedent`
    <p>Here is a pen</p>\n
    `)
  })
})
