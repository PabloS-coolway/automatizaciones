import { RrhhRole } from '@yorga/contracts';

/** Lo mínimo que necesita el bootstrap del módulo RRHH (para testearlo con fakes). */
export interface BootstrapRrhhDeps {
  /** id del usuario del login con ese correo, o null si no existe. */
  findUserIdByEmail(email: string): Promise<number | null>;
  /** ¿ese usuario ya tiene ficha de empleado? */
  findEmployeeByUserId(userId: number): Promise<{ id: number } | null>;
  createEmployee(e: { userId: number; fullName: string; rrhhRole: RrhhRole }): Promise<{ id: number }>;
}

/**
 * Crea el PRIMER empleado de RRHH al arrancar, leyéndolo del entorno (`RRHH_BOOTSTRAP_EMAIL`,
 * `RRHH_BOOTSTRAP_NAME`), con rol **ADMIN** dentro del módulo.
 *
 * Por qué existe: el módulo RRHH es "arranque en frío" — para dar de alta empleados hay que ser ya un empleado
 * con rol de gestión, así que **nadie** podría crear el primero desde la UI. Esto resuelve el huevo-y-gallina:
 * enlaza un **usuario del login que ya existe** (por correo) con una ficha de empleado ADMIN. A partir de ahí,
 * esa persona ya ve el módulo y da de alta al resto desde Personas.
 *
 * Es **idempotente**: si ese usuario ya tiene ficha, no hace nada. Puede correr en cada arranque; una vez
 * creado el primer empleado se puede quitar la variable. No lanza: un fallo aquí no debe tumbar la API.
 */
export async function bootstrapRrhh(deps: BootstrapRrhhDeps, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const email = env.RRHH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const name = env.RRHH_BOOTSTRAP_NAME?.trim();

  if (!email) return 'sin RRHH_BOOTSTRAP_EMAIL → no se crea empleado de arranque';

  const userId = await deps.findUserIdByEmail(email);
  if (!userId) return `RRHH: no hay ningún usuario con el correo ${email} → créalo antes en Usuarios`;
  if (await deps.findEmployeeByUserId(userId)) return `RRHH: el usuario ${email} ya tiene ficha de empleado → nada que hacer`;

  const empleado = await deps.createEmployee({ userId, fullName: name || email, rrhhRole: 'ADMIN' });
  return `RRHH: empleado de arranque creado: #${empleado.id} (${email}) con rol ADMIN (ya puedes quitar RRHH_BOOTSTRAP_EMAIL)`;
}
