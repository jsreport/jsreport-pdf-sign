import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect

class Properties extends Component {
  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  componentDidMount () {
    this.removeInvalidReferences()
  }

  componentDidUpdate () {
    this.removeInvalidReferences()
  }

  removeInvalidReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.pdfSign) {
      return
    }

    const updatedAssetItems = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entities[k].shortid === entity.pdfSign.certificateAssetShortid)

    if (updatedAssetItems.length === 0 && entity.pdfSign.certificateAssetShortid) {
      onChange({
        _id: entity._id,
        pdfSign: null
      })
    }
  }

  static title (entity, entities) {
    if (!entity.pdfSign || !entity.pdfSign.certificateAssetShortid) {
      return 'pdf sign'
    }

    const foundItems = Properties.selectAssets(entities).filter((e) => entity.pdfSign.certificateAssetShortid === e.shortid)

    if (!foundItems.length) {
      return 'pdf sign'
    }

    return 'pdf sign certificate: ' + foundItems[0].name
  }

  render () {
    const { entity, onChange } = this.props

    const pdfSign = entity.pdfSign || {}

    const changePdfSign = (change) => onChange({ ...entity, pdfSign: { ...entity.pdfSign, ...change } })

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select certificate'
            value={pdfSign.certificateAssetShortid || ''}
            onChange={(selected) => changePdfSign({ certificateAssetShortid: selected.length > 0 ? selected[0].shortid : null })}
            filter={(references) => ({ data: references.assets })}
          />
        </div>
        <div className='form-group'>
          <label>Reason filled to pdf</label>
          <input type='text' placeholder='signed...' value={pdfSign.reason} onChange={(v) => changePdfSign({ reason: v.target.value })} />
        </div>
        <div className='form-group'>
          <label>Enabled</label>
          <input type='checkbox' checked={pdfSign.enabled !== false} onChange={(v) => changePdfSign({ enabled: v.target.checked })} />
        </div>
      </div>
    )
  }
}

export default Properties
