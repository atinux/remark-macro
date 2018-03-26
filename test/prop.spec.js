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
const prop = require('../prop')

test.group('prop', (group) => {
  test('parse comma seperated props', (assert) => {
    const propsHash = prop('name=virk')
    assert.deepEqual(propsHash, { name: 'virk' })
  })

  test('parse multiple comma seperated props', (assert) => {
    const propsHash = prop('name=virk, age=22')
    assert.deepEqual(propsHash, { name: 'virk', age: '22' })
  })

  test('parse multiple comma seperated props without a space', (assert) => {
    const propsHash = prop('name=virk,age=22')
    assert.deepEqual(propsHash, { name: 'virk', age: '22' })
  })

  test('allow quoted values', (assert) => {
    const propsHash = prop('name="virk",age=22')
    assert.deepEqual(propsHash, { name: 'virk', age: '22' })
  })

  test('allow reserved values inside quoted values', (assert) => {
    const propsHash = prop('name="virk=nice", age=22')
    assert.deepEqual(propsHash, { name: 'virk=nice', age: '22' })
  })

  test('allow quotes inside quotes', (assert) => {
    const propsHash = prop('name="virk="nice"", age=22')
    assert.deepEqual(propsHash, { name: 'virk="nice"', age: '22' })
  })

  test('allow quotes with single level props', (assert) => {
    const propsHash = prop('name="virk=nice"')
    assert.deepEqual(propsHash, { name: 'virk=nice' })
  })

  test('allow comma inside quotes', (assert) => {
    const propsHash = prop('name="virk,nice", age=22')
    assert.deepEqual(propsHash, { name: 'virk,nice', age: '22' })
  })
})
