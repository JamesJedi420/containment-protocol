import React, { useState } from 'react';
import { getMajorIncidentFlowView } from './majorIncidentView';

export const MajorIncidentPage: React.FC = () => {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const view = getMajorIncidentFlowView();

  return (
    <div className="major-incident-page" style={{ display: 'flex', height: '100%', gap: 16 }}>
      {/* Left zone: Incident overview/context */}
      <div style={{ flex: 1, minWidth: 220, borderRight: '1px solid #ccc', padding: 12 }}>
        <h3>Incident Overview</h3>
        {view.context ? (
          <div>
            <div><strong>{view.context.title}</strong></div>
            <div>{view.context.briefing}</div>
            <div>Source: {view.context.source}</div>
            <div>Severity: {view.context.severity}</div>
            <div>Urgency: {view.context.urgency}</div>
            <div>Consequences:</div>
            <ul>
              {view.context.consequences.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        ) : <div>No active major incident.</div>}
      </div>
      {/* Center zone: Response options */}
      <div style={{ flex: 2, minWidth: 320, borderRight: '1px solid #ccc', padding: 12 }}>
        <h3>Response Options</h3>
        {view.responseOptions.map(opt => (
          <div key={opt.id} style={{ marginBottom: 12 }}>
            <button
              style={{
                width: '100%',
                textAlign: 'left',
                background: selectedResponseId === opt.id ? '#eef' : '#fff',
                border: '1px solid #bbb',
                borderRadius: 4,
                padding: 8,
                cursor: 'pointer',
              }}
              onClick={() => setSelectedResponseId(opt.id)}
            >
              <strong>{opt.label}</strong>
              <div style={{ fontSize: 12 }}>{opt.description}</div>
              {opt.blockers && opt.blockers.length > 0 && (
                <div style={{ color: '#c00', fontSize: 12 }}>{opt.blockers.join(', ')}</div>
              )}
            </button>
          </div>
        ))}
        {view.outcomePreview && (
          <div style={{ marginTop: 24, color: '#333' }}>
            <strong>Outcome Preview:</strong> {view.outcomePreview}
          </div>
        )}
      </div>
      {/* Right zone: Readiness/attrition/weakest-link */}
      <div style={{ flex: 1, minWidth: 220, padding: 12 }}>
        <h3>Readiness & Consequences</h3>
        {view.readiness ? (
          <div>
            <div><strong>Ready Teams:</strong> {view.readiness.readyTeams.join(', ')}</div>
            <div><strong>Staffing Gaps:</strong> {view.readiness.staffingGaps.join(', ')}</div>
            <div><strong>Recovery Constraints:</strong> {view.readiness.recoveryConstraints.join(', ')}</div>
            <div><strong>Attrition Pressure:</strong> {view.readiness.attritionPressure}</div>
            <div><strong>Weakest Link:</strong> {view.readiness.weakestLink}</div>
            <div><strong>Likely Blockers:</strong> {view.readiness.likelyBlockers.join(', ')}</div>
          </div>
        ) : <div>No readiness data.</div>}
      </div>
    </div>
  );
};

export default MajorIncidentPage;
