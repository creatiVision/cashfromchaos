import { round2 } from "@/lib/money";
import { Item } from "@/lib/types";

export interface DashboardStats {
  live: number;
  earned: number;
  pipeline: number;
}

export function calculateDashboardStats(items: Item[]): DashboardStats {
  let live = 0;
  let earned = 0;
  let pipeline = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.status !== "payout-released") {
      live += 1;
    }

    if (item.payment.status === "released") {
      let itemNet = 0;
      const ledger = item.ledger;
      for (let j = 0; j < ledger.length; j++) {
        itemNet += ledger[j].amount;
      }
      earned += round2(itemNet);
    } else {
      pipeline += item.payment.amount || item.policy.targetPrice;
    }
  }

  return { live, earned, pipeline };
}
