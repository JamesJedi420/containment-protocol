
import React, { useState } from 'react';
import { getMajorIncidentFlowView } from './majorIncidentView';
import './MajorIncidentPage.css';

export const MajorIncidentPage: React.FC = () => {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const view = getMajorIncidentFlowView();

  return (
    <div className="major-incident-page">
      {/* Left zone: Incident overview/context */}
      <div className="major-incident-left">
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
      <div className="major-incident-center">
        <h3>Response Options</h3>
        {view.responseOptions.map(opt => (
          <div key={opt.id} className="major-incident-response-option">
            <button
              className={`major-incident-response-btn${selectedResponseId === opt.id ? ' selected' : ''}`}
              onClick={() => setSelectedResponseId(opt.id)}
            >
              <strong>{opt.label}</strong>
              <div className="major-incident-response-desc">{opt.description}</div>
              {opt.blockers && opt.blockers.length > 0 && (
                <div className="major-incident-response-blockers">{opt.blockers.join(', ')}</div>
              )}
            </button>
          </div>
        ))}
        {view.outcomePreview && (
          <div className="major-incident-outcome-preview">
            <strong>Outcome Preview:</strong> {view.outcomePreview}
          </div>
        )}
      </div>
      {/* Right zone: Readiness/attrition/weakest-link */}
      <div className="major-incident-right">
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
