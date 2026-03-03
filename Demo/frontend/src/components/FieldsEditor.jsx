import React, { useMemo } from 'react'

function toRows(fields) {
  const obj = fields && typeof fields === 'object' ? fields : {}
  const keys = Object.keys(obj)
  keys.sort()
  return keys.map(k => ({ key: k, value: obj[k] }))
}

export function FieldsEditor({ fields, onChange }) {
  const rows = useMemo(() => toRows(fields), [fields])

  const setField = (key, value) => {
    const next = { ...(fields || {}) }
    if (!key) return
    next[key] = value
    onChange(next)
  }

  const removeField = key => {
    const next = { ...(fields || {}) }
    delete next[key]
    onChange(next)
  }

  const addField = () => {
    const base = 'newField'
    let key = base
    let i = 1
    while ((fields || {})[key] !== undefined) {
      key = `${base}${i++}`
    }
    const next = { ...(fields || {}), [key]: '' }
    onChange(next)
  }

  return (
    <div className="card">
      <div className="row rowSpaceBetween">
        <h2>Form fields</h2>
        <button className="secondary" onClick={addField}>
          Add field
        </button>
      </div>

      <div className="table">
        <div className="tableHead">
          <div>Field</div>
          <div>Value</div>
          <div />
        </div>
        {rows.length ? (
          rows.map(r => (
            <div key={r.key} className="tableRow">
              <div className="mono">{r.key}</div>
              <div>
                <input
                  value={r.value ?? ''}
                  onChange={e => setField(r.key, e.target.value)}
                  placeholder="value"
                />
              </div>
              <div className="tableActions">
                <button className="danger" onClick={() => removeField(r.key)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No fields yet. Upload a document or record speech.</div>
        )}
      </div>
    </div>
  )
}

