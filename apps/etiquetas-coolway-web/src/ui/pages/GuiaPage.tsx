import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, ListGroup } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Book } from 'react-bootstrap-icons';

import inicioImg from '../../assets/guia/cap-inicio.png';
import etiquetasImg from '../../assets/guia/cap-etiquetas.png';
import maestroImg from '../../assets/guia/cap-maestro.png';
import podaImg from '../../assets/guia/cap-poda.png';
import surtidosImg from '../../assets/guia/cap-surtidos.png';
import destinosImg from '../../assets/guia/cap-destinos.png';
import ficharImg from '../../assets/guia/cap-fichar.png';
import ausenciasImg from '../../assets/guia/cap-ausencias.png';
import avisosImg from '../../assets/guia/cap-avisos.png';
import personasImg from '../../assets/guia/cap-personas.png';
import rolesImg from '../../assets/guia/cap-roles.png';
import actividadImg from '../../assets/guia/cap-actividad.png';

/**
 * Guía de uso en formato «ebook»: capítulos con índice, imagen del módulo real y navegación anterior/siguiente.
 * Es informativa (no toca datos) y visible para todos; en el menú cada uno solo ve los módulos para los que tiene
 * permiso, pero aquí puede leer sobre todos. El contenido se mantiene como datos (CAPITULOS).
 */

interface Capitulo {
  id: string;
  grupo: string;
  titulo: string;
  menu?: string;
  quien?: string;
  intro: string;
  acciones?: string[];
  notas?: string[];
  img?: string;
}

const CAPITULOS: Capitulo[] = [
  {
    id: 'bienvenida',
    grupo: 'Introducción',
    titulo: 'Bienvenida a la guía',
    intro:
      'Esta guía explica, módulo a módulo, qué hace el panel de Coolway y cómo usarlo. Usa el índice de la izquierda para saltar a un capítulo, o los botones «Anterior» y «Siguiente» para leerla como un libro. En tu menú solo aparecen los módulos para los que tienes permiso; aquí puedes conocerlos todos.',
    notas: [
      'Cada capítulo indica quién puede usar el módulo y dónde está en el menú.',
      'El módulo de Personas (RRHH) tiene además una guía dedicada con más detalle.',
    ],
  },
  {
    id: 'inicio', grupo: 'Empezar aquí', titulo: 'Inicio', menu: 'Inicio', quien: 'Todos', img: inicioImg,
    intro: 'Tu pantalla de bienvenida: se adapta a tu rol y te lleva con un clic a todo lo que puedes usar.',
    acciones: [
      'Fichar y ver tu jornada de hoy sin salir de aquí (si eres empleado).',
      'Ver tus próximos cumpleaños del equipo y tu próxima ausencia.',
      'Si gestionas equipo, ver los indicadores: empleados activos, ausencias por aprobar, usuarios sin ficha, jornadas sin cerrar y fichados ahora.',
      'Accesos directos a los módulos disponibles para ti.',
    ],
    notas: ['Lo que ves cambia según tu rol y tus permisos: si algo no te aparece, es que tu usuario no tiene acceso a ese módulo.'],
  },
  {
    id: 'etiquetas', grupo: 'Etiquetas y colección', titulo: 'Etiquetas', menu: 'Etiquetas y colección → Etiquetas', quien: 'Operador y Admin · permiso «ver etiquetas»', img: etiquetasImg,
    intro: 'Generar el fichero de etiquetas de uno o varios pedidos de compra de SAP.',
    acciones: [
      'Elegir el Destino (el badge muestra qué códigos imprime) y el «Importado por».',
      'Elegir de dónde salen los códigos: «Maestro: base de datos» (solo subes los PDF) o «Subir Excel».',
      'Subir los PDF de pedido de SAP (y el Excel maestro, si toca).',
      'Pulsar «Generar etiquetas» y descargar cada fichero o «Descargar todo» en un ZIP.',
      'Revisar el resumen: pares generados, códigos faltantes y qué pedidos cuadran.',
    ],
    notas: [
      'Los códigos NUNCA se inventan: si falta uno, se avisa con el modelo y el motivo.',
      'Si un PDF viene incompleto, se recomienda no usar ese fichero hasta corregir la lectura.',
    ],
  },
  {
    id: 'maestro', grupo: 'Etiquetas y colección', titulo: 'Base de datos (maestro)', menu: 'Etiquetas y colección → Base de datos', quien: 'Consulta: «ver maestro» · Cargar: solo Admin', img: maestroImg,
    intro: 'El maestro de códigos Coolway (EAN/UPC por talla): la fuente de verdad de la que todo lo demás bebe.',
    acciones: [
      'Buscar por modelo, color, referencia, SKU o código y filtrar/ordenar.',
      'Exportar a Excel exactamente lo que ves («lo filtrado» o «todo»).',
      'Editar en línea el «color web» (con permiso).',
      '(Admin) «Cargar maestro» y «Importar al maestro» (EAN/UPC).',
    ],
    notas: [
      'Cargar el maestro añade y actualiza por referencia + talla; no borra nada.',
      'El «color web» editado a mano se conserva aunque el Excel traiga otro valor.',
      'Se avisan las filas rechazadas y los EAN13 repetidos para corregirlos en el Excel.',
    ],
  },
  {
    id: 'poda', grupo: 'Etiquetas y colección', titulo: 'Podar SAP', menu: 'Etiquetas y colección → Podar SAP', quien: 'Admin · permiso «cargar maestro»', img: podaImg,
    intro: 'Dejar los ficheros que saca SAP con solo lo realmente comprado; el resto de líneas se anulan.',
    acciones: [
      'Subir el borrador de prepedidos (el Excel de la compra, con la columna «Suma»).',
      'Subir los ficheros de SAP (materiales, tarifas, surtidos).',
      'Elegir la Sociedad (o dejar la de los ficheros) y, si quieres, «Aplicar surtidos».',
      'Pulsar «Podar» y descargar cada fichero ya podado.',
    ],
    notas: [
      'Nunca inventa: si algo comprado no aparece, avisa de que ese fichero venía incompleto.',
      'Si faltan códigos de color («Horma»), te lo dice para rellenarlos y volver a podar.',
    ],
  },
  {
    id: 'surtidos', grupo: 'Etiquetas y colección', titulo: 'Surtidos', menu: 'Etiquetas y colección → Surtidos', quien: 'Admin · permiso «cargar maestro»', img: surtidosImg,
    intro: 'El catálogo de qué surtidos conservar por grupo de referencia cuando se poda.',
    acciones: [
      'Ver los surtidos por grupo (p. ej. chica 76 / chico 86).',
      'Añadir un código de surtido (3 caracteres) a un grupo.',
      'Quitar un surtido de un grupo.',
    ],
    notas: ['Solo tiene efecto al podar si allí marcas «Aplicar surtidos».'],
  },
  {
    id: 'destinos', grupo: 'Etiquetas y colección', titulo: 'Destinos', menu: 'Etiquetas y colección → Destinos', quien: 'Permiso «gestionar destinos»', img: destinosImg,
    intro: 'Los destinos que se pueden elegir al generar etiquetas: qué códigos imprime cada uno y su «importado por».',
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
  {
    id: 'fichar', grupo: 'Personas (RRHH)', titulo: 'Fichar', menu: 'Personas → Fichar', quien: 'Empleados (con ficha)', img: ficharImg,
    intro: 'Fichar tu jornada (entrada, salida y pausas) y ver la de hoy.',
    acciones: [
      'Marcar entrada, salida e inicio/fin de pausa según tu estado.',
      'Ver el tiempo trabajado hoy y la lista de marcajes.',
      'Consultar tu jornada por mes en el calendario.',
    ],
    notas: [
      'La hora la pone el servidor, no tu móvil.',
      'Se pide la ubicación con permiso; si la deniegas, fichas igual sin ella.',
      'Si te dejas un fichaje abierto, al salir te pregunta cómo cerrarlo.',
    ],
  },
  {
    id: 'ausencias', grupo: 'Personas (RRHH)', titulo: 'Ausencias y vacaciones', menu: 'Personas → Ausencias', quien: 'Empleados · aprobar: responsables/RRHH', img: ausenciasImg,
    intro: 'Solicitar ausencias y vacaciones, ver su estado y (según tu rol) aprobarlas o administrarlas.',
    acciones: [
      '«Solicitar ausencia»: tipo, fechas, medio día, motivo y justificante (opcional).',
      'Ver tus solicitudes y cancelar las pendientes.',
      'Ver el calendario «Mi año» o «Equipo».',
      '(Responsables/RRHH) Aprobar o rechazar; (RRHH/Admin) gestionar tipos y festivos.',
    ],
    notas: [
      'Las vacaciones se cuentan en días naturales (el cupo habitual es 30 al año).',
      'El saldo «devengado» es una estimación provisional (borrador).',
    ],
  },
  {
    id: 'avisos', grupo: 'Personas (RRHH)', titulo: 'Avisos', menu: 'Personas → Avisos', quien: 'Empleados (con ficha)', img: avisosImg,
    intro: 'Las notificaciones del módulo de personal (solicitudes por aprobar, decisiones sobre tus ausencias…).',
    acciones: ['Ver tus avisos (los no leídos van marcados).', 'Marcar un aviso como leído.', 'Marcar todos como leídos.'],
    notas: ['El menú muestra un contador con los avisos sin leer.'],
  },
  {
    id: 'personas', grupo: 'Personas (RRHH)', titulo: 'Personas', menu: 'Personas → Personas', quien: 'Empleados ven lo básico · RRHH/Admin gestiona', img: personasImg,
    intro: 'La gestión del personal del grupo: plantilla, fichas, organigrama, control de fichajes y los maestros de RRHH.',
    acciones: [
      'Buscar en la plantilla y ver la ficha de cada persona.',
      '(RRHH/Admin) «Nuevo empleado» e «Importar fichas» (Excel), editar, dar de baja o reactivar.',
      'Ver el organigrama y exportar la plantilla a CSV.',
      '(RRHH/Admin) Pestaña «Maestros»: empresas, zonas, convenios y catálogos, con el editor de convenio→permisos.',
    ],
    notas: [
      'Cada empleado se enlaza a un usuario que ya existe (por su correo). Si no existe, créalo antes en Usuarios.',
      'La ficha incluye empresa, código, DNI, categoría, contrato, sección y antigüedad, y muestra los permisos por convenio.',
      'Los empleados se dan de baja/reactivan, no se borran. Este módulo tiene una guía dedicada paso a paso.',
    ],
  },
  {
    id: 'usuarios', grupo: 'Administración', titulo: 'Usuarios', menu: 'Administración → Usuarios', quien: 'Admin · permiso «gestionar usuarios»',
    intro: 'Dar de alta y gestionar quién accede a la herramienta.',
    acciones: [
      '«Nuevo usuario»: nombre, email, contraseña y rol; puedes crear a la vez su ficha de empleado.',
      '«Importar Excel» para dar de alta en masa.',
      'Cambiar el rol, resetear la contraseña o desactivar/activar un usuario.',
    ],
    notas: [
      'No puedes cambiar tu propio rol ni desactivarte a ti mismo.',
      'Los roles disponibles se definen en el módulo de Roles.',
    ],
  },
  {
    id: 'roles', grupo: 'Administración', titulo: 'Roles', menu: 'Administración → Roles', quien: 'Admin · permiso «gestionar roles»', img: rolesImg,
    intro: 'Definir qué puede hacer cada rol marcando permisos; cada usuario ve y usa solo lo que su rol permite.',
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
    id: 'actividad', grupo: 'Administración', titulo: 'Actividad', menu: 'Administración → Actividad', quien: 'Permiso «ver actividad»', img: actividadImg,
    intro: 'El registro de auditoría: quién hizo qué sobre usuarios, roles, destinos y las cargas del maestro.',
    acciones: [
      'Ver los movimientos con fecha, usuario, acción y resumen.',
      'Abrir el detalle de un cambio (comparativa «antes → después»).',
      'Filtrar y ordenar el registro.',
    ],
    notas: ['El registro es inmutable: no se puede editar ni borrar.'],
  },
];

export function GuiaPage() {
  const [idx, setIdx] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const cap = CAPITULOS[idx];

  // Al cambiar de capítulo, sube al principio del lector.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [idx]);

  // Índice agrupado (respeta el orden de aparición de los grupos).
  const grupos = useMemo(() => {
    const orden: string[] = [];
    const map = new Map<string, { i: number; c: Capitulo }[]>();
    CAPITULOS.forEach((c, i) => {
      if (!map.has(c.grupo)) { map.set(c.grupo, []); orden.push(c.grupo); }
      map.get(c.grupo)!.push({ i, c });
    });
    return orden.map((g) => ({ grupo: g, items: map.get(g)! }));
  }, []);

  return (
    <div className="page" ref={topRef}>
      <header className="page-head mb-4 d-flex align-items-center gap-2">
        <Book className="text-secondary" size={22} />
        <div>
          <h1 className="h4 mb-1">Guía de uso</h1>
          <p className="text-secondary mb-0">Manual del panel, módulo a módulo. Léelo como un libro o salta por el índice.</p>
        </div>
      </header>

      <div className="d-flex flex-column flex-lg-row gap-4 align-items-start">
        {/* Índice */}
        <nav aria-label="Índice de la guía" className="w-100" style={{ maxWidth: 300, flex: '0 0 auto' }}>
          <div style={{ position: 'sticky', top: 16 }}>
            {grupos.map((g) => (
              <div key={g.grupo} className="mb-3">
                <div className="text-uppercase text-secondary small fw-semibold mb-1" style={{ letterSpacing: '.06em' }}>{g.grupo}</div>
                <ListGroup variant="flush">
                  {g.items.map(({ i, c }) => (
                    <ListGroup.Item
                      key={c.id}
                      action
                      active={i === idx}
                      onClick={() => setIdx(i)}
                      className="d-flex align-items-baseline gap-2 border-0 rounded px-2 py-1"
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="text-secondary small" style={{ fontFamily: 'var(--bs-font-monospace, monospace)', minWidth: '1.6em' }}>{String(i).padStart(2, '0')}</span>
                      <span>{c.titulo}</span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            ))}
          </div>
        </nav>

        {/* Lector */}
        <article className="flex-grow-1 w-100" style={{ minWidth: 0, maxWidth: 760 }}>
          <Card>
            <Card.Body className="p-4 p-md-5">
              <div className="text-uppercase small fw-semibold mb-2" style={{ letterSpacing: '.08em', color: 'var(--bs-secondary-color, #6c757d)' }}>
                {idx === 0 ? 'Introducción' : `Capítulo ${idx} · ${cap.grupo}`}
              </div>
              <h2 className="mb-2">{cap.titulo}</h2>

              {(cap.quien || cap.menu) && (
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  {cap.quien && <Badge bg="secondary-subtle" text="secondary" style={{ whiteSpace: 'normal' }}>{cap.quien}</Badge>}
                  {cap.menu && <span className="text-secondary small" style={{ fontFamily: 'var(--bs-font-monospace, monospace)' }}>{cap.menu}</span>}
                </div>
              )}

              {cap.img && (
                <figure className="mb-4">
                  <img
                    src={cap.img}
                    alt={`Captura del módulo ${cap.titulo}`}
                    className="w-100"
                    style={{ height: 'auto', borderRadius: 12, border: '1px solid var(--bs-border-color, #dee2e6)', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}
                  />
                  <figcaption className="text-secondary small mt-2">Así se ve «{cap.titulo}» en el panel.</figcaption>
                </figure>
              )}

              <p className="fs-5">{cap.intro}</p>

              {cap.acciones && cap.acciones.length > 0 && (
                <>
                  <h3 className="h6 fw-semibold mt-4 mb-2">Qué puedes hacer</h3>
                  <ul className="ps-3">
                    {cap.acciones.map((a, i) => <li key={i} className="mb-2">{a}</li>)}
                  </ul>
                </>
              )}

              {cap.notas && cap.notas.length > 0 && (
                <div className="mt-4 p-3 rounded" style={{ background: 'var(--bs-secondary-bg, #f1f3f5)' }}>
                  <div className="text-uppercase small fw-semibold mb-2" style={{ letterSpacing: '.06em' }}>Ten en cuenta</div>
                  <ul className="ps-3 mb-0 text-secondary">
                    {cap.notas.map((n, i) => <li key={i} className="mb-1">{n}</li>)}
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Navegación anterior / siguiente */}
          <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
            <Button variant="outline-secondary" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
              <ChevronLeft className="me-1" /> Anterior
            </Button>
            <span className="text-secondary small">{idx + 1} de {CAPITULOS.length}</span>
            <Button variant="outline-secondary" disabled={idx === CAPITULOS.length - 1} onClick={() => setIdx((i) => Math.min(CAPITULOS.length - 1, i + 1))}>
              Siguiente <ChevronRight className="ms-1" />
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
