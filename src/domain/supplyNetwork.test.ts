import { describe, it, expect } from 'vitest';
import { advanceSupplyNetworkState, SupplyNetworkState, SupplySupportState } from './supplyNetwork';

const minimalNetwork: SupplyNetworkState = {
  nodes: [
    { id: 'n1', label: 'Command Center', type: 'command_center', controller: 'agency', active: true, strategicValue: 5, regionTags: ['bio_containment'] },
    { id: 'n2', label: 'Depot', type: 'depot', controller: 'agency', active: true, strategicValue: 3, regionTags: ['occult_district'] },
  ],
  sources: [
    { id: 's1', label: 'HQ', type: 'command', nodeId: 'n1', active: true, throughput: 2 },
  ],
  links: [
    { id: 'l1', from: 'n1', to: 'n2', mode: 'road', status: 'open', capacity: 2 },
  ],
  transportAssets: [
    { id: 't1', label: 'Convoy', class: 'truck_column', mode: 'road', status: 'ready', lift: 2, fragility: 1, routeNodeIds: ['n1', 'n2'] },
  ],
};

describe('advanceSupplyNetworkState', () => {
  it('supports a region with a connected source and ready transport', () => {
    const result = advanceSupplyNetworkState(minimalNetwork, []);
    const trace = result?.traces?.find(t => t.regionTag === 'occult_district');
    expect(trace?.state).toBe<SupplySupportState>('supported');
    expect(trace?.transportAssetId).toBe('t1');
  });

  it('marks region unsupported if transport is disrupted', () => {
    const disrupted = { ...minimalNetwork, transportAssets: [{ ...minimalNetwork.transportAssets[0], status: 'disrupted' }] };
    const result = advanceSupplyNetworkState(disrupted, []);
    const trace = result?.traces?.find(t => t.regionTag === 'occult_district');
    expect(trace?.state).toBe<SupplySupportState>('unsupported');
    expect(trace?.blockedReason).toBe('transport_disrupted');
  });

  it('marks region unsupported if no open route', () => {
    const blocked = { ...minimalNetwork, links: [{ ...minimalNetwork.links[0], status: 'blocked' }] };
    const result = advanceSupplyNetworkState(blocked, []);
    const trace = result?.traces?.find(t => t.regionTag === 'occult_district');
    expect(trace?.state).toBe<SupplySupportState>('unsupported');
    expect(trace?.blockedReason).toBe('path_blocked');
  });

  it('marks region unsupported if no transport asset', () => {
    const noTransport = { ...minimalNetwork, transportAssets: [] };
    const result = advanceSupplyNetworkState(noTransport, []);
    const trace = result?.traces?.find(t => t.regionTag === 'occult_district');
    expect(trace?.state).toBe<SupplySupportState>('unsupported');
    expect(trace?.blockedReason).toBe('no_transport');
  });

  it('strategic node value contributes to control score', () => {
    const result = advanceSupplyNetworkState(minimalNetwork, []);
    expect(result?.lastSummary?.strategicControlScore).toBeGreaterThan(0);
  });
});
