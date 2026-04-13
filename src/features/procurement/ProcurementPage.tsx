import React, { useState } from 'react';
import { getProcurementScreenView } from './procurementView';
import './ProcurementPage.css';

// TODO: Wire to canonical state/store

export const ProcurementPage: React.FC = () => {
  // Placeholder: Replace with canonical state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const view = getProcurementScreenView();

  const selected = view.options.find(opt => opt.id === selectedOptionId) || null;

  return (
    <div className="procurement-page">
      {/* Left zone: Procurement options */}
      <div className="procurement-left">
        <h3>Procurement Options</h3>
        <ul className="procurement-options-list">
          {view.options.map(opt => (
            <li key={opt.id} className="procurement-option-item">
              <button
                className={`procurement-option-btn${selectedOptionId === opt.id ? ' selected' : ''}`}
                onClick={() => setSelectedOptionId(opt.id)}
                disabled={!!opt.blockers.length}
              >
                <div className="procurement-option-row">
                  <strong>{opt.name}</strong>
                  <span className={`procurement-category${opt.category === 'Equipment' ? ' equipment' : opt.category === 'Fabrication' ? ' fabrication' : ''}`}>{opt.category}</span>
                  {opt.isCritical && <span className="procurement-critical">Critical</span>}
                  {!opt.isCritical && opt.isRecommended && <span className="procurement-recommended">Recommended</span>}
                </div>
                <div>Cost: ${opt.cost}</div>
                <div className={opt.affordable ? 'procurement-affordable' : 'procurement-not-affordable'}>
                  {opt.affordable ? 'Affordable' : 'Not affordable'}
                </div>
                {opt.blockers.length > 0 && (
                  <div className="procurement-blockers">
                    {opt.blockers.join(', ')}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Center zone: Detail panel */}
      <div className="procurement-center">
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
            {selected.isCritical && <div className="procurement-critical">Critical Priority</div>}
            {!selected.isCritical && selected.isRecommended && <div className="procurement-recommended">Recommended</div>}
            <button
              disabled={!selected.affordable || !!selected.blockers.length}
              onClick={() => view.onRequest(selected.id)}
              className="procurement-request-btn"
            >
              Request / Purchase
            </button>
          </div>
        ) : (
          <div>Select an option to inspect details.</div>
        )}
      </div>
      {/* Right zone: Budget, blockers, backlog */}
      <div className="procurement-right">
        <h3>Budget & Backlog</h3>
        <div>
          <strong>Budget:</strong> ${view.budget.funding} <br />
          <strong>Pressure:</strong> {view.budget.budgetPressure}/4 <br />
          <strong>Blockers:</strong> {view.budget.blockers.join(', ') || 'None'}
        </div>
        {view.budget.backlogSignal && (
          <div className="procurement-backlog-signal">{view.budget.backlogSignal}</div>
        )}
        <div className="procurement-section">
          <strong>Pending Procurement:</strong>
          <ul className="procurement-backlog-list">
            {view.backlog.map(entry => (
              <li key={entry.requestId} className="procurement-backlog-item">
                {entry.name} — ${entry.cost} [{entry.status}]
              </li>
            ))}
            {view.backlog.length === 0 && <li>None</li>}
          </ul>
        </div>
        <div className="procurement-section">
          <strong>Pressure Consequences:</strong>
          <div>{view.budget.pressureConsequences}</div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementPage;
