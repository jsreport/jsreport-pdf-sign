module.exports = {
  'name': 'pdf-sign',
  'dependencies': ['templates', 'assets'],
  'main': 'lib/main.js',
  'optionsSchema': {
    extensions: {
      'pdf-sign': {
        type: 'object',
        properties: {
          secret: { type: 'string' }
        }
      }
    }
  }
}
