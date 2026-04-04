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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      setErrorMessage(null)
      onAnalyze?.(result)
    } catch (err) {
      setPredictionResult(null)
      setErrorMessage(err instanceof Error ? err.message : 'Chemistry prediction failed.')
    }
  }

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  return (
    <section className="panel panel-support space-y-4" aria-label="Chemistry prediction tool">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Chemistry prediction tool</h3>
        <p className="text-sm opacity-60">Simulate roster changes before assigning teams.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="team-select"
            className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
          >
            Base team
          </label>
          <select
            id="team-select"
            className="form-select"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            title="Select a team to analyze"
          >
            <option value="">Select a team...</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
          Proposed roster
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {activeAgents.map((agent) => {
            const selected = selectedAgentIds.includes(agent.id)
            return selected ? (
              <button
                key={agent.id}
                type="button"
                className="btn btn-sm btn-primary justify-between"
                aria-pressed="true"
                onClick={() => toggleAgent(agent.id)}
              >
                {agent.name}
              </button>
            ) : (
              <button
                key={agent.id}
                type="button"
                className="btn btn-sm btn-ghost justify-between"
                aria-pressed="false"
                onClick={() => toggleAgent(agent.id)}
              >
                {agent.name}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePredict}
        className="btn btn-sm"
        disabled={!selectedTeamId}
      >
        Calculate chemistry
      </button>

      {errorMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded border border-rose-400/30 bg-rose-500/8 px-3 py-2 text-sm text-rose-200"
        >
          {errorMessage}
        </p>
      ) : null}

      {predictionResult && (
        <div className="rounded border border-white/10 bg-white/5 px-3 py-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="opacity-60">Current chemistry</span>
              <span className="font-mono font-semibold">
                {predictionResult.currentChemistry.bonus.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="opacity-60">Predicted chemistry</span>
              <span className="font-mono font-semibold">
                {predictionResult.predictedChemistry.bonus.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="opacity-60">Delta</span>
              <span
                className={`font-mono font-semibold ${predictionResult.delta > 0 ? 'text-emerald-300' : predictionResult.delta < 0 ? 'text-rose-300' : ''}`}
              >
                {predictionResult.delta > 0 ? '+' : ''}
                {predictionResult.delta.toFixed(2)}
              </span>
            </div>
          </div>

          {predictionResult.agentsRemoved.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Agents removed</p>
              <ul className="mt-1 list-disc pl-5 text-sm opacity-80">
                {predictionResult.agentsRemoved.map((a: Agent) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </div>
          )}

          {predictionResult.agentsAdded.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Agents added</p>
              <ul className="mt-1 list-disc pl-5 text-sm opacity-80">
                {predictionResult.agentsAdded.map((a: Agent) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
