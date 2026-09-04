import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import prisma from "./lib/prisma.js";

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