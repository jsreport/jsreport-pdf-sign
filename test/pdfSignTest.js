const should = require('should')
const jsreport = require('jsreport-core')
const fs = require('fs')
const path = require('path')
const { extractSignature } = require('node-signpdf/dist/helpers.js')

describe('pdf-sign', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      encryption: {
        secretKey: '1111111811111118'
      },
      templatingEngines: {
        strategy: 'in-process'
      }
    }).use(require('../')())
      .use(require('jsreport-templates')())
      .use(require('jsreport-chrome-pdf')())
      .use(require('jsreport-assets')())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should produce pdf with sign', async () => {
    const result = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
            password: 'node-signpdf'
          }
        }
      }
    })

    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)
  })

  it('should be able to reference stored asset', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'certificate.p12',
      shortid: 'certificate',
      content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
      pdfSign: {
        passwordRaw: 'node-signpdf'
      }
    })

    const result = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAssetShortid: 'certificate'
        }
      }
    })

    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)
  })

  it('should crypt password before insert', async () => {
    const res = await reporter.documentStore.collection('assets').insert({
      name: 'a',
      content: 'hello',
      engine: 'none',
      recipe: 'html',
      pdfSign: {
        passwordRaw: 'foo'
      }
    })

    should(res.pdfSign.passwordRaw).be.null()
    res.pdfSign.passwordSecure.should.not.be.eql('foo')
    res.pdfSign.passwordFilled.should.be.true()
  })

  it('should crypt password before update', async () => {
    await reporter.documentStore.collection('assets').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    })

    await reporter.documentStore.collection('assets').update({ name: 'a' }, {
      $set: {
        pdfSign: {
          passwordRaw: 'foo'
        }
      }
    })

    const entity = await reporter.documentStore.collection('assets').findOne({
      name: 'a'
    })

    should(entity.pdfSign.passwordRaw).be.null()
    entity.pdfSign.passwordSecure.should.not.be.eql('foo')
    entity.pdfSign.passwordFilled.should.be.true()
  })

  it('should use asset encoding when inline in the request', async () => {
    const result = await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'chrome-pdf',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')).toString('base64'),
            encoding: 'base64',
            password: 'node-signpdf'
          }
        }
      }
    })

    const { signature, signedData } = extractSignature(result.content)
    signature.should.be.of.type('string')
    signedData.should.be.instanceOf(Buffer)
  })

  it('should not fail for none pdf recipe', async () => {
    await reporter.render({
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'html',
        pdfSign: {
          certificateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
            password: 'node-signpdf'
          }
        }
      }
    })
  })
})
