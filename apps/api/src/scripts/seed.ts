import prisma from "../lib/prisma.js";
import { syncAllCatalogs } from "../services/catalogSync.js";

async function main() {
  console.log("Starting QuickCompare catalog synchronization into PostgreSQL...");
  const summary = await syncAllCatalogs(prisma);
  console.log("Catalog synchronization completed successfully:");
  console.log(`- Providers synced: ${summary.providersSynced}`);
  console.log(
    `- Products created: ${summary.productsCreated}, updated: ${summary.productsUpdated}`,
  );
  console.log(
    `- Offers created: ${summary.offersCreated}, updated: ${summary.offersUpdated}`,
  );
  console.log(
    `- PriceHistory entries created: ${summary.priceHistoryEntriesCreated}`,
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Catalog synchronization failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
