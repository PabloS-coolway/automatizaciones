import { useMemo, useState } from 'react';
import { Badge, Card, Form } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';

/**
 * Guía de uso del panel: documentación de todos los módulos, escrita desde el lado del usuario. Es informativa
 * (no toca datos) y visible para todos; cada uno solo verá en el menú los módulos para los que tiene permiso, pero
 * aquí puede leer qué hace cada uno. El contenido se mantiene como datos (MODULOS) y se pinta abajo.
 */

interface ModuloDoc {
  id: string;
  titulo: string;
  menu: string; // dónde está en el menú
  quien: string; // quién lo usa / permiso
  que: string; // para qué sirve, una frase
  acciones: string[];
  notas?: string[];
}

interface GrupoDoc {
  grupo: string;
  intro: string;
  modulos: ModuloDoc[];
}

const GUIA: GrupoDoc[] = [
  {
    grupo: 'Empezar aquí',
    intro: 'El punto de entrada del panel.',
    modulos: [
      {
        id: 'inicio',
        titulo: 'Inicio',
        menu: 'Inicio',
        quien: 'Todos',
        que: 'Tu pantalla de bienvenida: se adapta a tu rol y te lleva con un clic a todo lo que puedes usar.',
        acciones: [
          'Fichar y ver tu jornada de hoy sin salir de aquí (si eres empleado).',
          'Ver tus próximos cumpleaños del equipo y tu próxima ausencia.',
          'Si gestionas equipo, ver los indicadores: empleados activos, ausencias por aprobar, usuarios sin ficha, jornadas sin cerrar y fichados ahora.',
          'Accesos directos a los módulos disponibles para ti.',
        ],
        notas: ['Lo que ves cambia según tu rol y tus permisos: si algo no te aparece, es que tu usuario no tiene acceso a ese módulo.'],
      },
    ],
  },
  {
    grupo: 'Etiquetas y colección',
    intro: 'El circuito de etiquetas y el maestro de códigos Coolway, la fuente de verdad.',
    modulos: [
      {
        id: 'etiquetas',
        titulo: 'Etiquetas',
        menu: 'Etiquetas y colección → Etiquetas',
        quien: 'Operador y Admin (permiso «ver etiquetas»)',
        que: 'Generar el fichero de etiquetas de uno o varios pedidos de compra de SAP.',
        acciones: [
          'Elegir el Destino (el badge te muestra qué códigos imprime ese destino) y el «Importado por».',
          'Elegir de dónde salen los códigos: «Maestro: base de datos» (solo subes los PDF) o «Subir Excel».',
          'Subir los PDF de pedido de SAP (y el Excel maestro, si elegiste esa opción).',
          'Pulsar «Generar etiquetas» y descargar cada fichero, o «Descargar todo» en un ZIP.',
          'Revisar el resumen: pares generados, códigos faltantes y qué pedidos cuadran.',
        ],
        notas: [
          'Los códigos NUNCA se inventan: si falta uno en el maestro, se te avisa con el modelo y el motivo.',
          'Si un PDF viene incompleto, el sistema lo dice y recomienda NO usar ese fichero hasta corregir la lectura.',
        ],
      },
      {
        id: 'maestro',
        titulo: 'Base de datos (maestro)',
        menu: 'Etiquetas y colección → Base de datos',
        quien: 'Consulta: permiso «ver maestro». Cargar: solo Admin.',
        que: 'El maestro de códigos Coolway (EAN/UPC por talla): la fuente de verdad de la que todo lo demás bebe.',
        acciones: [
          'Buscar por modelo, color, referencia, SKU o código y filtrar/ordenar la tabla.',
          'Exportar a Excel exactamente lo que ves («lo filtrado» o «todo»).',
          'Editar en línea el «color web» (si tienes ese permiso).',
          '(Admin) «Cargar maestro»: subir el Excel de referencias.',
          '(Admin) «Importar al maestro»: subir los ficheros de EAN y UPC.',
        ],
        notas: [
          'Cargar el maestro añade y actualiza por referencia + talla; no borra nada.',
          'El «color web» que edites a mano se conserva aunque el Excel traiga otro valor.',
          'Se avisan las filas rechazadas y los EAN13 repetidos para que se corrijan en el Excel.',
        ],
      },
      {
        id: 'poda',
        titulo: 'Podar SAP',
        menu: 'Etiquetas y colección → Podar SAP',
        quien: 'Admin (permiso «cargar maestro»)',
        que: 'Dejar los ficheros que saca SAP con solo lo realmente comprado; el resto de líneas se anulan.',
        acciones: [
          'Subir el borrador de prepedidos (el Excel de la compra, con la columna «Suma»).',
          'Subir los ficheros de SAP (materiales, tarifas, surtidos).',
          'Elegir la Sociedad (o dejar la que traen los ficheros) y, si quieres, «Aplicar surtidos».',
          'Pulsar «Podar» y descargar cada fichero ya podado.',
        ],
        notas: [
          'Nunca inventa: si algo comprado no aparece en un fichero, te avisa de que ese fichero venía incompleto.',
          'Si faltan códigos de color («Horma») en el borrador, te lo dice para que los rellenes y vuelvas a podar.',
        ],
      },
      {
        id: 'surtidos',
        titulo: 'Surtidos',
        menu: 'Etiquetas y colección → Surtidos',
        quien: 'Admin (permiso «cargar maestro»)',
        que: 'El catálogo de qué surtidos conservar por grupo de referencia cuando se poda.',
        acciones: [
          'Ver los surtidos por grupo (p. ej. chica 76 / chico 86).',
          'Añadir un código de surtido (3 caracteres) a un grupo.',
          'Quitar un surtido de un grupo.',
        ],
        notas: ['Solo tiene efecto al podar si allí marcas «Aplicar surtidos».'],
      },
      {
        id: 'destinos',
        titulo: 'Destinos',
        menu: 'Etiquetas y colección → Destinos',
        quien: 'Permiso «gestionar destinos»',
        que: 'Los destinos que se pueden elegir al generar etiquetas: qué códigos imprime cada uno y su «importado por».',
        acciones: [
          '«Nuevo destino»: código, nombre, «importado por» y qué códigos de barras imprime.',
          'Editar un destino (el código no se cambia: es su identidad).',
          'Desactivar o activar un destino.',
        ],
        notas: [
          'Los destinos se desactivan, no se borran (para no romper pedidos antiguos).',
          'Una etiqueta debe llevar al menos un código de barras.',
        ],
      },
    ],
  },
  {
    grupo: 'Personas (RRHH)',
    intro: 'El módulo de personal: fichar, ausencias, avisos y la gestión de la plantilla. Necesitas tener ficha de empleado para verlo.',
    modulos: [
      {
        id: 'fichar',
        titulo: 'Fichar',
        menu: 'Personas → Fichar',
        quien: 'Empleados (con ficha de empleado)',
        que: 'Fichar tu jornada (entrada, salida y pausas) y ver la de hoy.',
        acciones: [
          'Marcar entrada, salida e inicio/fin de pausa según tu estado.',
          'Ver el tiempo trabajado hoy y la lista de marcajes.',
          'Consultar tu jornada por mes en el calendario.',
        ],
        notas: [
          'La hora la pone el servidor, no tu móvil.',
          'Se pide la ubicación con permiso; si la deniegas, fichas igual sin ella. Nunca bloquea el fichaje.',
          'Si te dejas un fichaje abierto, al salir te pregunta si cerrar con tu jornada teórica o registrar el tiempo real.',
        ],
      },
      {
        id: 'ausencias',
        titulo: 'Ausencias y vacaciones',
        menu: 'Personas → Ausencias',
        quien: 'Empleados. Aprobar: responsables/RRHH. Tipos y festivos: RRHH/Admin.',
        que: 'Solicitar ausencias y vacaciones, ver su estado, y (según tu rol) aprobarlas o administrarlas.',
        acciones: [
          '«Solicitar ausencia»: tipo, fechas, medio día, motivo y justificante (opcional).',
          'Ver tus solicitudes y cancelar las que estén pendientes.',
          'Ver el calendario «Mi año» o «Equipo».',
          '(Responsables/RRHH) Aprobar o rechazar las del equipo.',
          '(RRHH/Admin) Gestionar los tipos de ausencia y los festivos.',
        ],
        notas: [
          'Las vacaciones se cuentan en días naturales (el cupo habitual es 30 al año).',
          'El saldo «devengado» es una estimación provisional (borrador), no una cifra para basar decisiones.',
        ],
      },
      {
        id: 'avisos',
        titulo: 'Avisos',
        menu: 'Personas → Avisos',
        quien: 'Empleados (con ficha)',
        que: 'Las notificaciones del módulo de personal (solicitudes por aprobar, decisiones sobre tus ausencias…).',
        acciones: ['Ver tus avisos (los no leídos van marcados).', 'Marcar un aviso como leído.', 'Marcar todos como leídos.'],
        notas: ['El menú muestra un contador con los avisos sin leer.'],
      },
      {
        id: 'personas',
        titulo: 'Personas',
        menu: 'Personas → Personas',
        quien: 'Empleados ven lo básico; RRHH/Admin gestiona la plantilla.',
        que: 'La gestión del personal del grupo: plantilla, fichas, organigrama, control de fichajes y los maestros de RRHH.',
        acciones: [
          'Buscar en la plantilla y ver la ficha de cada persona.',
          '(RRHH/Admin) «Nuevo empleado» e «Importar fichas» (Excel), editar, dar de baja o reactivar.',
          'Ver el organigrama y exportar la plantilla a CSV.',
          '(RRHH/Admin) Pestaña «Maestros»: empresas, zonas, convenios y catálogos, con el editor de convenio→permisos.',
        ],
        notas: [
          'Cada empleado se enlaza a un usuario que ya existe (por su correo). Si no existe, créalo antes en Usuarios.',
          'La ficha incluye sociedad, código, DNI, categoría, contrato, sección y antigüedad, y muestra los permisos por convenio.',
          'Los empleados se dan de baja/reactivan, no se borran.',
          'Tiene su propia guía detallada, paso a paso.',
        ],
      },
    ],
  },
  {
    grupo: 'Administración',
    intro: 'Quién entra en la herramienta, qué puede hacer cada rol y el registro de todo lo que pasa.',
    modulos: [
      {
        id: 'usuarios',
        titulo: 'Usuarios',
        menu: 'Administración → Usuarios',
        quien: 'Admin (permiso «gestionar usuarios»)',
        que: 'Dar de alta y gestionar quién accede a la herramienta.',
        acciones: [
          '«Nuevo usuario»: nombre, email, contraseña y rol; puedes crear a la vez su ficha de empleado.',
          '«Importar Excel» para dar de alta en masa.',
          'Cambiar el rol de un usuario, resetear su contraseña o desactivarlo/activarlo.',
        ],
        notas: [
          'No puedes cambiar tu propio rol ni desactivarte a ti mismo.',
          'Los roles disponibles se definen en el módulo de Roles.',
        ],
      },
      {
        id: 'roles',
        titulo: 'Roles',
        menu: 'Administración → Roles',
        quien: 'Admin (permiso «gestionar roles»)',
        que: 'Definir qué puede hacer cada rol marcando permisos; cada usuario ve y usa solo lo que su rol permite.',
        acciones: [
          '«Nuevo rol»: código, nombre y los permisos (checkboxes).',
          'Editar los permisos de un rol (el código no se cambia).',
          'Desactivar o activar un rol.',
        ],
        notas: [
          'Los permisos son un catálogo cerrado (se marcan, no se escriben).',
          'El sistema impide quedarse sin ningún rol que pueda gestionar roles (para no bloquearse).',
        ],
      },
      {
        id: 'actividad',
        titulo: 'Actividad',
        menu: 'Administración → Actividad',
        quien: 'Permiso «ver actividad»',
        que: 'El registro de auditoría: quién hizo qué sobre usuarios, roles, destinos y las cargas del maestro.',
        acciones: [
          'Ver los movimientos con fecha, usuario, acción y resumen.',
          'Abrir el detalle de un cambio (comparativa «antes → después»).',
          'Filtrar y ordenar el registro.',
        ],
        notas: ['El registro es inmutable: no se puede editar ni borrar.'],
      },
    ],
  },
];

export function GuiaPage() {
  const [q, setQ] = useState('');

  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return GUIA;
    return GUIA.map((g) => ({
      ...g,
      modulos: g.modulos.filter((m) =>
        [m.titulo, m.que, m.quien, m.menu, ...m.acciones, ...(m.notas ?? [])].join(' ').toLowerCase().includes(t),
      ),
    })).filter((g) => g.modulos.length > 0);
  }, [q]);

  return (
    <div className="page">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Guía de uso</h1>
        <p className="text-secondary mb-0">
          Qué hace cada módulo del panel y cómo usarlo, explicado paso a paso. En tu menú solo aparecen los módulos
          para los que tienes permiso, pero aquí puedes conocerlos todos.
        </p>
      </header>

      <div style={{ maxWidth: 420 }} className="mb-4">
        <div className="position-relative">
          <Search className="position-absolute text-secondary" style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <Form.Control
            id="guia-buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en la guía (p. ej. «etiquetas», «vacaciones», «convenio»…)"
            style={{ paddingLeft: 36 }}
            aria-label="Buscar en la guía"
          />
        </div>
      </div>

      {grupos.length === 0 && <p className="text-secondary">No hay resultados para «{q}».</p>}

      {grupos.map((g) => (
        <section key={g.grupo} className="mb-4">
          <div className="mb-2">
            <h2 className="h6 text-uppercase text-secondary mb-1" style={{ letterSpacing: '.06em' }}>{g.grupo}</h2>
            <p className="text-secondary small mb-0">{g.intro}</p>
          </div>
          <div className="d-grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}>
            {g.modulos.map((m) => (
              <Card key={m.id} className="h-100">
                <Card.Body>
                  <Card.Title as="h3" className="h6 mb-1">{m.titulo}</Card.Title>
                  <div className="text-secondary small mb-2" style={{ fontFamily: 'var(--bs-font-monospace, monospace)' }}>{m.menu}</div>
                  <div className="mb-2">
                    <Badge bg="secondary-subtle" text="secondary" style={{ whiteSpace: 'normal', textAlign: 'left' }}>{m.quien}</Badge>
                  </div>
                  <p className="mb-2">{m.que}</p>
                  <div className="fw-semibold small mb-1">Qué puedes hacer</div>
                  <ul className="small mb-0 ps-3">
                    {m.acciones.map((a, i) => (
                      <li key={i} className="mb-1">{a}</li>
                    ))}
                  </ul>
                  {m.notas && m.notas.length > 0 && (
                    <>
                      <div className="fw-semibold small mt-3 mb-1">Ten en cuenta</div>
                      <ul className="small mb-0 ps-3 text-secondary">
                        {m.notas.map((n, i) => (
                          <li key={i} className="mb-1">{n}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
