// Stable development-only IDs from database/seed.sql. They are excluded from
// real listing/account workflows even before the optional is_demo migration runs.
const DEMO_USER_IDS = [
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
];

const DEMO_LISTING_IDS = [
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007',
  'd0000000-0000-0000-0000-000000000008',
];

const toPostgrestIn = ids => `(${ids.map(id => `"${id}"`).join(',')})`;

module.exports = {
  DEMO_USER_IDS,
  DEMO_LISTING_IDS,
  DEMO_USER_FILTER: toPostgrestIn(DEMO_USER_IDS),
  DEMO_LISTING_FILTER: toPostgrestIn(DEMO_LISTING_IDS),
  isDemoUser: id => DEMO_USER_IDS.includes(id),
  isDemoListing: id => DEMO_LISTING_IDS.includes(id),
};
