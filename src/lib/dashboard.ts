import { netPayout } from "@/lib/payments";
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
      earned += netPayout(item);
    } else {
      pipeline += item.payment.amount || item.policy.targetPrice;
    }
  }

  return { live, earned, pipeline };
}
