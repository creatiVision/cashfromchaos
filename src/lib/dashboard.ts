import { netPayout } from "@/lib/payments";
import { Item } from "@/lib/types";

export interface DashboardStats {
  live: number;
  earned: number;
  pipeline: number;
}

export function calculateDashboardStats(items: Item[]): DashboardStats {
  return items.reduce(
    (acc, item) => {
      if (item.status !== "payout-released") {
        acc.live += 1;
      }
      if (item.payment.status === "released") {
        acc.earned += netPayout(item);
      } else {
        acc.pipeline += item.payment.amount || item.policy.targetPrice;
      }
      return acc;
    },
    { live: 0, earned: 0, pipeline: 0 }
  );
}
