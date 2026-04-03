import { useMemo, useState } from 'react'
import type { Agent, GameState, ChemistryPredictionResult } from '../../domain/models'
import { predictChemistryWithRosterChange } from '../../domain/sim/chemistryPolish'

interface ChemistryAnalysisPanelProps {
  state: GameState
  agents: Record<string, Agent>
  onAnalyze?: (result: ChemistryPredictionResult) => void
}

export function ChemistryAnalysisPanel({ state, agents, onAnalyze }: ChemistryAnalysisPanelProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [predictionResult, setPredictionResult] = useState<ChemistryPredictionResult | null>(null)

  const teamOptions = useMemo(() => Object.values(state.teams), [state.teams])
  const activeAgents = useMemo(
    () => Object.values(agents).filter((a) => a.status === 'active'),
    [agents]
  )

  const handlePredict = () => {
    if (!selectedTeamId) return

    try {
      const result = predictChemistryWithRosterChange({
        baseTeamId: selectedTeamId,
        proposedAgentIds: selectedAgentIds,
        currentAgents: agents,
        currentTeams: state.teams,
      })
      setPredictionResult(result)
      onAnalyze?.(result)
    } catch (err) {
      console.error('Chemistry prediction failed:', err)
    }
  }

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  return (
    <div className="chemistry-analysis-panel">
      <h3>Chemistry Prediction Tool</h3>

      <div className="control-group">
        <label htmlFor="team-select">Base Team:</label>
        <select
          id="team-select"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          title="Select a team to analyze"
        >          <option value="">Select a team...</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label>Proposed Roster:</label>
        <div className="agent-grid">
          {activeAgents.map((agent) => (
            <button
              key={agent.id}
              className={`agent-toggle ${selectedAgentIds.includes(agent.id) ? 'selected' : ''}`}
              onClick={() => toggleAgent(agent.id)}
            >
              {agent.name}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handlePredict} className="predict-button" disabled={!selectedTeamId}>
        Calculate Chemistry
      </button>

      {predictionResult && (
        <div className="prediction-results">
          <div className="result-row">
            <span>Current Chemistry:</span>
            <span className="value">{predictionResult.currentChemistry.bonus.toFixed(2)}</span>
          </div>
          <div className="result-row">
            <span>Predicted Chemistry:</span>
            <span className="value">{predictionResult.predictedChemistry.bonus.toFixed(2)}</span>
          </div>
          <div className="result-row">
            <span>Delta:</span>
            <span
              className={`value ${predictionResult.delta > 0 ? 'positive' : predictionResult.delta < 0 ? 'negative' : ''}`}
            >
              {predictionResult.delta > 0 ? '+' : ''}{predictionResult.delta.toFixed(2)}
            </span>
          </div>

          {predictionResult.agentsRemoved.length > 0 && (
            <div className="details">
              <p className="label">Agents removed:</p>
              <ul>
                {predictionResult.agentsRemoved.map((a: Agent) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </div>
          )}

          {predictionResult.agentsAdded.length > 0 && (
            <div className="details">
              <p className="label">Agents added:</p>
              <ul>
                {predictionResult.agentsAdded.map((a: Agent) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .chemistry-analysis-panel {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f9f9f9;
        }

        .control-group {
          margin: 1rem 0;
        }

        .control-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .control-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.5rem;
        }

        .agent-toggle {
          padding: 0.5rem;
          border: 2px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .agent-toggle.selected {
          background: #4CAF50;
          color: white;
          border-color: #45a049;
        }

        .predict-button {
          padding: 0.75rem 1.5rem;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }

        .predict-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .prediction-results {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }

        .result-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }

        .result-row .value {
          font-weight: 600;
          font-family: monospace;
        }

        .result-row .value.positive {
          color: #4CAF50;
        }

        .result-row .value.negative {
          color: #f44336;
        }

        .details {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #eee;
        }

        .details .label {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
          color: #666;
        }

        .details ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .details li {
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
