import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import prisma from "./lib/prisma.js";
import {
  AllProvidersFailedError,
  searchAllProviders,
} from "./providers/index.js";
import { compareOffers } from "./services/comparison.js";

type CompareQuerystring = {
  q?: string;
};

const app = Fastify({
  logger: true,
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
      const offers = await searchAllProviders(query);
      const result = compareOffers(offers);

      return {
        query,
        result,
      };
    } catch (error) {
      if (error instanceof AllProvidersFailedError) {
        request.log.error(error);
        return reply.status(502).send({
          error: "Provider search failed",
        });
      }

      throw error;
    }
  },
);

const start = async () => {
  try {
    await app.listen({
      port: 4000,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();