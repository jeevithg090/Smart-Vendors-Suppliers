import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 5 minutes to check for expired group orders
crons.interval(
  "expire-group-orders",
  { minutes: 5 },
  internal.groupOrders.expireGroupOrders
);

// Run every minute to check for orders that should be locked
crons.interval(
  "check-and-lock-orders",
  { minutes: 1 },
  internal.groupOrders.checkAndLockOrders
);

export default crons;