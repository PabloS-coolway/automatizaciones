/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@yorga/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
  /**
   * La cobertura se mide sobre la LÓGICA, no sobre el pegamento de framework: incluir módulos de
   * Nest, `main.ts`, ports (que son sólo tipos) o adapters de Prisma hunde el porcentaje sin decir
   * nada útil, y acabaríamos bajando el listón para que pasara. Lo que se mide es lo que puede
   * romper el negocio: dominio, casos de uso y los parsers.
   */
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/interface/**', // CLI y controladores HTTP: pegamento (se prueban a mano / e2e)
    '!src/**/main.ts',
    '!src/**/tokens.ts',
    '!src/**/*.port.ts', // ports: sólo interfaces, no hay nada que ejecutar
    '!src/**/ports.ts',
    '!src/**/model/**', // esquemas zod / tipos
    '!src/**/prisma-*.ts', // adapter de BD: se verifica contra Postgres de verdad
    '!src/**/prisma.service.ts',
    '!src/**/*excel*.ts', // lectores/escritores de Excel: I/O, validados contra ficheros reales
    '!src/**/db-master-reader.ts',
    '!src/**/default-master-provider.ts',
    '!src/**/core.providers.ts', // cableado de dependencias
    '!src/auth/**', // login/roles: pendiente de tests (ver ESTADO.md)
  ],
  coverageThreshold: {
    // Si baja del 75%, `npm test` FALLA. No es decorativo: es la puerta de calidad.
    global: { statements: 75, branches: 70, functions: 75, lines: 75 },
  },
};
