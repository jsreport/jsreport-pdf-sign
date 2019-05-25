#jsreport-html-to-text

jsreport recipe transforming html to text using node package [html-to-text](https://github.com/werk85/node-html-to-text). See the docs http://jsreport.net/learn/html-to-text 

##Installation

> **npm install jsreport-html-to-text**

##Usage
To use `recipe` in for template rendering set `template.recipe=html-to-text` in the rendering request.

```js
{
  template: { content: '...', recipe: 'html-to-text', engine: '...' }
}
```

##jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('jsreport-core')()
jsreport.use(require('jsreport-html-to-text')())
```
