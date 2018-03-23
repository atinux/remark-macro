# Remark Macro

The library gives you an opportunity to define macros, which can be used inside the markdown as follows.

```md
# Hello

Writing some markdown

[alert]
This is an alert message
[/alert]
```

The `alert` block is knows as a macro. By default the library will not parse this block. However, you can define a macro and then it will be parsed and all the contents will be forwarded to you.

```js
const macro = require('remark-macro')()

macro.addMacro('alert', function (content, props) {
  assert.equal(content, 'This is an alert message')
  assert.deepEqual(props, {})
})
```

## Installation

```
npm i --save remark-macro
```

## Usage

```js
const remark = require('remark')
const macro = require('macro')()
const html = require('remark-html')

macro.addMacro('alert', function (content, props, { transformer, eat }) {
  return {
    type: 'AlertNode',
    data: {
      hName: 'div',
      hClassNames: ['alert alert-note'],
      hChildren: transformer.tokenizeBlock(content, eat.now())
    }
  } 
})

const markdown = `
# Hello world

[alert]
This is an alert
[/alert]
`

remark()
  .use(macro.transformer)
  .use(html)
  .process(markdown, function (error, result) {
    console.log(result.toString())
  })
  
/**
 <h1> Hello world </h1>
 <div class="alert alert-note"><p> This is an alert </p></div>
*/
```
