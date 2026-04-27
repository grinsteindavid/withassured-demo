// Client-safe subscription plan catalog.
//
// This module has zero server dependencies (no Prisma, no DB, no auth) so it
// can be imported from "use client" components without dragging server code
// into the browser bundle. Server modules import this too for the price
// lookup table.

export const SUBSCRIPTION_PRICING = {
  STARTUP: { platformFeeCents: 29_900, name: "Startup" },
  GROWTH: { platformFeeCents: 99_900, name: "Growth" },
  ENTERPRISE: { platformFeeCents: 299_900, name: "Enterprise" },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PRICING;
