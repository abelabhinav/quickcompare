import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { CompareResponse } from "@quickcompare/shared";
import prisma from "./lib/prisma.js";
import { searchProductsInDb } from "./services/productRepository.js";
import { compareOffers } from "./services/comparison.js";
import { getProductPriceHistory } from "./services/priceHistory.js";

type CompareQuerystring = {
  q?: string;
};

type ProductParams = {
  id: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createServer() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  await app.register(cors);
  await app.register(helmet);

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "quickcompare-api",
    };
  });

  app.get("/health/db", async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: "connected",
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        status: "error",
        database: "disconnected",
      });
    }
  });

  app.get<{ Querystring: CompareQuerystring }>(
    "/api/compare",
    async (request, reply) => {
      const query = request.query.q?.trim();

      if (!query) {
        return reply.status(400).send({
          error: "Query parameter 'q' is required and must be a non-empty string",
        });
      }

      try {
        const offers = await searchProductsInDb(query, prisma);
        const result = compareOffers(offers);

        const response: CompareResponse = {
          query,
          result,
        };

        return response;
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Comparison search failed",
        });
      }
    },
  );

  app.get<{ Params: ProductParams }>(
    "/api/products/:id/price-history",
    async (request, reply) => {
      const productId = request.params.id.trim();

      if (!UUID_PATTERN.test(productId)) {
        return reply.status(400).send({
          error: "Product ID must be a valid UUID",
        });
      }

      try {
        const result = await getProductPriceHistory(productId, prisma);

        if (!result.found) {
          return reply.status(404).send({
            error: "Product not found",
          });
        }

        return result.data;
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Price history lookup failed",
        });
      }
    },
  );

  return app;
}

const start = async () => {
  try {
    const server = await createServer();
    await server.listen({
      port: 4000,
      host: "0.0.0.0",
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (process.argv[1]?.includes("server") && !process.env.VITEST) {
  start();
}
