import React from 'react'

function normalize(items) {
  return Array.isArray(items) ? items : []
}

export function EquipmentTable({ items, onChange }) {
  const rows = normalize(items)

  const setRow = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    onChange(next)
  }

  const removeRow = idx => {
    const next = rows.filter((_, i) => i !== idx)
    onChange(next)
  }

  const addRow = () => {
    onChange([...rows, { name: '', quantity: 1, unit: '', location: '' }])
  }

  return (
    <div className="card">
      <div className="row rowSpaceBetween">
        <h2>Equipment</h2>
        <button className="secondary" onClick={addRow}>
          Add item
        </button>
      </div>

      <div className="table">
        <div className="tableHead tableHead4">
          <div>Name</div>
          <div>Qty</div>
          <div>Unit</div>
          <div>Location</div>
          <div />
        </div>
        {rows.length ? (
          rows.map((r, idx) => (
            <div key={idx} className="tableRow tableRow4">
              <div>
                <input
                  value={r.name || ''}
                  onChange={e => setRow(idx, { name: e.target.value })}
                  placeholder="Bandage"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={typeof r.quantity === 'number' ? r.quantity : 1}
                  onChange={e => setRow(idx, { quantity: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div>
                <input
                  value={r.unit || ''}
                  onChange={e => setRow(idx, { unit: e.target.value })}
                  placeholder="ea"
                />
              </div>
              <div>
                <input
                  value={r.location || ''}
                  onChange={e => setRow(idx, { location: e.target.value })}
                  placeholder="Ambulance"
                />
              </div>
              <div className="tableActions">
                <button className="danger" onClick={() => removeRow(idx)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty muted">
            No equipment detected yet. (If AI is configured, OCR may populate this.)
          </div>
        )}
      </div>
    </div>
  )
}

