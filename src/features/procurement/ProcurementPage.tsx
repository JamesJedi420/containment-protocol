import React, { useState } from 'react';
import { getProcurementScreenView } from './procurementView';

// TODO: Wire to canonical state/store

export const ProcurementPage: React.FC = () => {
  // Placeholder: Replace with canonical state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const view = getProcurementScreenView();

  const selected = view.options.find(opt => opt.id === selectedOptionId) || null;

  return (
    <div className="procurement-page" style={{ display: 'flex', height: '100%', gap: 16 }}>
      {/* Left zone: Procurement options */}
      <div style={{ flex: 1, minWidth: 220, borderRight: '1px solid #ccc', padding: 12 }}>
        <h3>Procurement Options</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {view.options.map(opt => (
            <li key={opt.id} style={{ marginBottom: 8 }}>
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: selectedOptionId === opt.id ? '#eef' : '#fff',
                  border: '1px solid #bbb',
                  borderRadius: 4,
                  padding: 8,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedOptionId(opt.id)}
                disabled={!!opt.blockers.length}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{opt.name}</strong>
                  <span style={{
                    fontSize: 12,
                    padding: '2px 6px',
                    borderRadius: 8,
                    background: opt.category === 'Equipment' ? '#e0f7fa' : opt.category === 'Fabrication' ? '#fff3e0' : '#eee',
                    color: '#333',
                  }}>{opt.category}</span>
                  {opt.isCritical && <span style={{ color: '#c00', fontWeight: 'bold', fontSize: 12 }}>Critical</span>}
                  {!opt.isCritical && opt.isRecommended && <span style={{ color: '#080', fontWeight: 'bold', fontSize: 12 }}>Recommended</span>}
                </div>
                <div>Cost: ${opt.cost}</div>
                <div style={{ fontSize: 12, color: opt.affordable ? '#080' : '#c00' }}>
                  {opt.affordable ? 'Affordable' : 'Not affordable'}
                </div>
                {opt.blockers.length > 0 && (
                  <div style={{ color: '#c00', fontSize: 12 }}>
                    {opt.blockers.join(', ')}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Center zone: Detail panel */}
      <div style={{ flex: 2, minWidth: 320, borderRight: '1px solid #ccc', padding: 12 }}>
        <h3>Detail</h3>
        {selected ? (
          <div>
            <h4>{selected.name}</h4>
            <div>{selected.description}</div>
            <div>Cost: ${selected.cost}</div>
            <div>Category: {selected.category}</div>
            <div>Source: {selected.source}</div>
            <div>Availability: {selected.availability}</div>
            <div>Budget Impact: {selected.budgetImpact}</div>
            <div>After Purchase: ${selected.afterFunding}</div>
            <div>Pressure Consequences: {selected.pressureConsequences}</div>
            <div>Blockers: {selected.blockers.join(', ') || 'None'}</div>
            {selected.isCritical && <div style={{ color: '#c00', fontWeight: 'bold' }}>Critical Priority</div>}
            {!selected.isCritical && selected.isRecommended && <div style={{ color: '#080', fontWeight: 'bold' }}>Recommended</div>}
            <button
              disabled={!selected.affordable || !!selected.blockers.length}
              onClick={() => view.onRequest(selected.id)}
              style={{ marginTop: 12 }}
            >
              Request / Purchase
            </button>
          </div>
        ) : (
          <div>Select an option to inspect details.</div>
        )}
      </div>
      {/* Right zone: Budget, blockers, backlog */}
      <div style={{ flex: 1, minWidth: 220, padding: 12 }}>
        <h3>Budget & Backlog</h3>
        <div>
          <strong>Budget:</strong> ${view.budget.funding} <br />
          <strong>Pressure:</strong> {view.budget.budgetPressure}/4 <br />
          <strong>Blockers:</strong> {view.budget.blockers.join(', ') || 'None'}
        </div>
        {view.budget.backlogSignal && (
          <div style={{ color: '#c00', fontWeight: 'bold', marginTop: 8 }}>{view.budget.backlogSignal}</div>
        )}
        <div style={{ marginTop: 16 }}>
          <strong>Pending Procurement:</strong>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {view.backlog.map(entry => (
              <li key={entry.requestId} style={{ marginBottom: 6 }}>
                {entry.name} — ${entry.cost} [{entry.status}]
              </li>
            ))}
            {view.backlog.length === 0 && <li>None</li>}
          </ul>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Pressure Consequences:</strong>
          <div>{view.budget.pressureConsequences}</div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementPage;
