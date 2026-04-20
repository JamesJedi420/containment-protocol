import React from 'react';
import { useGameStore } from '../../app/store/gameStore';
import { getTrainingDivisionView } from './trainingView';

export default function TrainingDivisionPage() {
  const { game } = useGameStore();
  // For now, use default filters. In a real app, these would be user-controlled.
  const filters = {
    q: '',
    readiness: 'all',
    queueScope: 'all',
    sort: 'default',
  };
  const view = getTrainingDivisionView(game, filters);

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <h2 className="text-lg font-semibold">Training Division</h2>
        {view.trainingRecommendation && (
          <div className="bg-blue-900/40 rounded p-3 mb-2">
            <strong>Recommended next move:</strong> {view.trainingRecommendation.title}
            <div className="text-xs opacity-80">{view.trainingRecommendation.detail}</div>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold">Training Catalog</h3>
            <ul className="space-y-2">
              {view.agentPrograms.map((program: any) => (
                <li key={program.trainingId}>{program.trainingName}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold">Active Queue</h3>
            <ul className="space-y-2">
              {view.queueViews.map((q: any) => (
                <li key={q.id}>{q.agentName} - {q.trainingName}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold">Eligible Roster</h3>
            <ul className="space-y-2">
              {view.filteredRosterViews.map((r: any) => (
                <li key={r.agent.id}>{r.agent.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </article>
      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Team Drills</h3>
        <ul className="space-y-2">
          {view.teamPrograms.map((program: any) => (
            <li key={program.trainingId}>{program.trainingName}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
