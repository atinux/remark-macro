'use strict'

/**
 * remark-macro
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

function mergeNode (node, result) {
  if (!node.key) {
    return
  }
  result[node.key] = node.value
  node.key = ''
  node.value = ''
}

module.exports = function (inString) {
  const chars = inString.split('')
  const result = {}
  const node = {
    key: '',
    value: ''
  }
  let prop = 'key'
  let underQuotes = false
  let oldCharCode = ''

  while (chars.length) {
    const char = chars.shift()
    const charCode = char.charCodeAt(0)

    if (charCode === 34 && (!chars[0] || [32, 44].indexOf(chars[0].charCodeAt(0)) > -1)) {
      /**
       * The current char is a quote AND (next char doesn't exists OR next char is a SPACE
       * or COMMA)
       */
      underQuotes = false
    } else if (underQuotes) {
      /**
       * If under quotes, then use all characters
       */
      node[prop] += char
    } else if (charCode === 34 && [32, 61].indexOf(oldCharCode) > -1) {
      /**
       * The current char is a quote AND previous char was a EQUAL TO or SPACE
       */
      underQuotes = true
    } else if (charCode === 32) {
      // ignore whitespace when not underQuotes
    } else if (charCode === 61) {
      /**
       * After EQUAL TO, we shift the prop to be value
       */
      prop = 'value'
    } else if (charCode === 44) {
      /**
       * After COMMA, we shift the prop to be key
       */
      prop = 'key'
      mergeNode(node, result)
    } else {
      /**
       * Else use all values
       */
      node[prop] += char
    }

    oldCharCode = charCode
  }

  mergeNode(node, result)
  return result
}
