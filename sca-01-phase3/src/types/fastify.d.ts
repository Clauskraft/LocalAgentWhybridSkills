import { TokenPayload } from "../auth/jwtAuth.js";

declare module "fastify" {
  interface FastifyRequest {
    user: TokenPayload | null;
    requestId: string;
  }

  interface FastifyInstance {
    verifyJwt: (request: FastifyRequest) => Promise<void>;
  }
}

