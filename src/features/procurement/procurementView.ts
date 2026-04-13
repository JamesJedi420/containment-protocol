// View-model for Procurement / Market Screen (SPE-34)

import { assessFundingPressure, getCanonicalFundingState, getProcurementBacklog } from '../../domain/funding';
import { getEquipmentCatalogEntries } from '../../domain/equipment';
import { productionCatalog } from '../../data/production';
import { useGameStore } from '../../app/store/gameStore';

// Types for the procurement screen
export interface ProcurementOptionView {
  id: string;
  name: string;
  description?: string;
  cost: number;
  category?: string;
  source?: string;
  availability?: string;
  affordable: boolean;
  blockers: string[];
  budgetImpact?: string;
  pressureConsequences?: string;
  afterFunding?: number;
  isRecommended?: boolean;
  isCritical?: boolean;
}

export interface ProcurementBacklogEntryView {
  requestId: string;
  name: string;
  cost: number;
  status: string;
}

export interface ProcurementScreenView {
  options: ProcurementOptionView[];
  backlog: ProcurementBacklogEntryView[];
  budget: {
    funding: number;
    budgetPressure: number;
    blockers: string[];
    pressureConsequences?: string;
    backlogSignal?: string;
  };
  onRequest: (optionId: string) => void;
}

// Main view-model function
export function getProcurementScreenView(): ProcurementScreenView {
  // Use canonical game state from the store
  const game = useGameStore.getState().game;
  const fundingState = getCanonicalFundingState(game);
  const fundingPressure = assessFundingPressure(game);
  const backlog = getProcurementBacklog(fundingState);

  // Aggregate all procurement options (equipment + fabrication/production)
  const equipmentOptions = getEquipmentCatalogEntries().map((def) => {
    // Affordability and blockers
    const cost = 100; // Placeholder, replace with real cost
    const affordable = fundingState.funding >= cost;
    const afterFunding = fundingState.funding - cost;
    const blockers: string[] = [];
    if (!affordable) blockers.push('Insufficient funds');
    // Priority: recommend if budget pressure is low and affordable, critical if pressure is high and affordable
    const isCritical = fundingPressure.budgetPressure >= 3 && affordable;
    const isRecommended = fundingPressure.budgetPressure < 2 && affordable;
    return {
      id: def.id,
      name: def.name,
      description: undefined, // Could add from definition
      cost,
      category: 'Equipment',
      source: 'Quartermaster',
      availability: 'Available',
      affordable,
      blockers,
      budgetImpact: `-$${cost}`,
      pressureConsequences: undefined,
      afterFunding,
      isCritical,
      isRecommended,
    };
  });

  const fabricationOptions = productionCatalog.map((recipe) => {
    const cost = recipe.baseFundingCost;
    const affordable = fundingState.funding >= cost;
    const afterFunding = fundingState.funding - cost;
    const blockers: string[] = [];
    if (!affordable) blockers.push('Insufficient funds');
    // Priority: recommend if backlog is low, critical if pressure is high
    const isCritical = fundingPressure.budgetPressure >= 3 && affordable;
    const isRecommended = fundingPressure.budgetPressure < 2 && affordable;
    return {
      id: recipe.recipeId,
      name: recipe.name,
      description: recipe.description,
      cost,
      category: 'Fabrication',
      source: 'Workshop',
      availability: 'Available',
      affordable,
      blockers,
      budgetImpact: `-$${cost}`,
      pressureConsequences: undefined,
      afterFunding,
      isCritical,
      isRecommended,
    };
  });

  // Combine all options
  const options = [...equipmentOptions, ...fabricationOptions];

  // Map backlog entries
  const backlogView: ProcurementBacklogEntryView[] = backlog.map((entry) => {
    // Try to resolve name from equipment or production
    const eq = getEquipmentCatalogEntries().find((e) => e.id === entry.itemId);
    const prod = productionCatalog.find((r) => r.outputItemId === entry.itemId);
    return {
      requestId: entry.requestId,
      name: eq?.name || prod?.outputItemName || entry.itemId,
      cost: entry.cost,
      status: entry.status,
    };
  });

  // Backlog pressure signal
  const backlogPending = backlog.filter((e) => e.status === 'pending').length;
  const backlogStale = backlog.filter((e) => e.status === 'pending' && fundingPressure.staleProcurementRequestIds.includes(e.requestId)).length;
  let backlogSignal = '';
  if (backlogPending >= 5) backlogSignal = 'Backlog congestion';
  else if (backlogStale > 0) backlogSignal = 'Delay risk';

  // Budget/pressure summary
  const budget = {
    funding: fundingPressure.funding,
    budgetPressure: fundingPressure.budgetPressure,
    blockers: fundingPressure.reasonCodes,
    pressureConsequences: fundingPressure.budgetPressure >= 2 ? 'High pressure' : 'Low',
    backlogSignal,
  };

  // Canonical purchase/request action
  function onRequest(optionId: string) {
    const opt = options.find((o) => o.id === optionId);
    if (!opt || !opt.affordable) return;
    // Canonical action: dispatch to store
    // For equipment: treat as market inventory purchase
    // For fabrication: treat as production/fabrication request
    if (opt.category === 'Equipment') {
      useGameStore.getState().purchaseMarketInventory(optionId);
    } else if (opt.category === 'Fabrication') {
      useGameStore.getState().queueFabrication(optionId);
    }
  }

  return {
    options,
    backlog: backlogView,
    budget,
    onRequest,
  };
}
