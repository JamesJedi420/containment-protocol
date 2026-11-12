import type { GameState } from '../../domain/models'
import { queryWorkshopStaffTime } from '../../domain/workshopStaffTime'

export function getWorkshopStaffTimeView(game: GameState) {
  const query = queryWorkshopStaffTime(game)
  return {
    ...query,
    receipts: query.receipts.map((receipt) => ({
      ...receipt,
      unusable:
        receipt.status === 'active' &&
        receipt.week === query.week &&
        !query.usableCommitmentIds.includes(receipt.id),
    })),
    orders: query.orders.map((order) => ({
      id: order.id,
      destination: `workshop:${order.id}`,
      commitmentId: `workshop:${query.week}:${order.id}`,
    })),
  }
}
