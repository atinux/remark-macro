'use strict'

/*
 * remark-macro
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const macroRegex = /^\[(\w+)(.*)?\]\n/
const Qs = require('haye/dist/haye-qs')
const JsonPresenter = require('haye/dist/haye-json-presenter')
const visit = require('unist-util-visit')

/**
 * Returns a bad node. This will be later used to
 * show linting errors
 *
 * @method badNode
 *
 * @param  {String} message
 *
 * @return {Object}
 */
function badNode (message) {
  return {
    type: 'BadMacroNode',
    data: {
      hName: 'div',
      hChildren: [
        {
          type: 'text',
          value: message
        }
      ]
    }
  }
}

/**
 * Used to detect bad nodes and report them to
 * the linter
 *
 * @method linterFn
 *
 * @param  {Object} tree
 * @param  {Object} file
 *
 * @return {void}
 */
function linterFn (tree, file) {
  visit(tree, 'BadMacroNode', visitor)
  function visitor (node) {
    file.message(node.data.hChildren[0].value, node.position.start)
  }
}

module.exports = function () {
  /**
   * Hash of registered macros
   *
   * @type {Object}
   */
  const macros = {}

  function transformNodes (eat, value, silent) {
    const match = macroRegex.exec(value)
    if (!match || match.index !== 0 || silent) {
      return
    }

    const macro = match[1].trim()

    /**
     * Return when the syntax matches but there is
     * no registered macro for same
     */
    if (!macros[macro]) {
      return
    }

    /**
     * The macro tag and it's properties
     */
    const tag = {
      macro: macro,
      isClosed: false,
      body: [],
      children: [],
      props: match[2]
    }

    const lines = value.split('\n')

    /**
     * Loop over all the lines until we find a closing tag
     * or the content ends. If there is no ending content
     * then we add a missing macro node for linter
     */
    while (lines.length) {
      const line = lines.shift()

      tag.body.push(line)

      /**
       * Found ending tag. So break
       * the loop
       */
      if (line === `[/${macro}]`) {
        tag.isClosed = true
        break
      }

      if (line !== `[${macro}]`) {
        tag.children.push(line)
      }
    }

    /**
     * Done with all the content, but the tag was never
     * closed
     */
    if (!tag.isClosed) {
      eat(match[0])(badNode(`Unclosed macro: ${macro}`))
      return
    }

    /**
     * Create a hash of props
     *
     * @type {Object}
     */
    const propsHash = tag.props ? Qs(tag.props, new JsonPresenter()) : {}

    /**
     * Payload object to be used for effeciently generating
     * ast nodes.
     *
     * @type {Object}
     */
    const macroFnPayload = {
      transformer: this,
      eat,
      badNode
    }

    const children = tag.children.join('\n')
    const body = tag.body.join('\n')
    const astNode = macros[macro](children, propsHash, macroFnPayload)

    /**
     * We eat the macro block and replace with the new ast, only when the macroFn
     * returns a new AST
     */
    astNode ? eat(body)(astNode) : eat(body)
  }

  return {
    /**
     * Adds a new macro to the macros list
     *
     * @method addMacro
     *
     * @param  {String}   name
     * @param  {Function} fn
     *
     * @example
     * ```
     * addMacro('alert', function (content, props, { transfomer, eat }) {
     *   return {
     *     type: 'AlertNode',
     *     data: {
     *       hName: 'div',
     *       children: transfomer.tokenizeBlock(content, eat.now()),
     *       properties: {
     *         className: ['']
     *       }
     *     }
     *   }
     * })
     * ```
     */
    addMacro (name, fn) {
      if (macros[name]) {
        throw new Error(`Cannot redefine the macro ${name}. One already exists`)
      }

      if (typeof (fn) !== 'function') {
        throw new Error('addMacro expects 2nd argument to be a function')
      }

      macros[name] = fn
      return this
    },

    /**
     * The method to the passed to remark that simply
     * hoosk into the blockTokenizers
     *
     * @method transform
     *
     * @return {void}
     *
     * @example
     * ```
     * remark.use(macro.transformer)
     * ```
     */
    transformer () {
      const { blockMethods, blockTokenizers } = this.Parser.prototype
      blockMethods.splice(blockMethods.indexOf('paragraph'), 0, 'macro')
      blockTokenizers.macro = transformNodes

      return linterFn
    }
  }
}
