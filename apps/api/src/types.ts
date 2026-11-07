import type { Perfil } from '@taxi/shared';

export interface JwtUser {
  sub: string;
  perfil: Perfil;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}
