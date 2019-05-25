import React, { Component } from 'react'

class Properties extends Component {
  static title (entity, entities) {
    if (!entity.pdfSign) {
      return 'pdf sign'
    }

    return entity.pdfSign.passwordFilled ? 'pdf sign password filled' : 'pdf sign'
  }

  render () {
    const { entity, onChange } = this.props

    const pdfSign = entity.pdfSign || {}

    const changePdfSign = (change) => onChange({ ...entity, pdfSign: { ...entity.pdfSign, ...change } })

    return (
      <div className='properties-section'>
        <div className='form-group'><label>password</label>
          <input
            type='password' value={pdfSign.passwordRaw || '*******'}
            onChange={(v) => changePdfSign({ passwordRaw: v.target.value })} />
        </div>
      </div>
    )
  }
}

export default Properties
