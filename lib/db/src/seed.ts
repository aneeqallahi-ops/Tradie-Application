import { db, clientsTable, quotesTable, quoteLineItemsTable, jobsTable, invoicesTable, expensesTable, vehicleTripsTable, subcontractorsTable, tradieUsersTable } from "./index";

async function seed() {
  console.log("Seeding database...");

  // We seed as a demo — real users won't have this data, but it shows
  // what the app looks like when in use.
  // NOTE: This does NOT create auth users — that requires Replit OIDC.

  console.log("Seed complete. (Note: tradie users require Replit Auth login)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
