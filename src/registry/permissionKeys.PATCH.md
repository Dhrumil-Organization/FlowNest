In `src/registry/permissionKeys.ts`, inside the existing `commercial` block, add one line:

  commercial: {
    costing: 'costing',
    costingCalculator: 'costing.calculator',
    costingYarnPrices: 'costing.yarn_prices',
    costingColourwayTiers: 'costing.colourway_tiers',
    costingHistory: 'costing.history',
    costingVariance: 'costing.variance',
    orders: 'orders',
    orderEntry: 'orders.new_order',
    orderAuthorization: 'orders.authorization',
    orderTracking: 'orders.tracking',
    priority: 'priority',           // <-- ADD THIS LINE
  },

Nothing else in this file changes.
