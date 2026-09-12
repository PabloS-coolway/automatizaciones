import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Form, ListGroup, ProgressBar } from 'react-bootstrap';
import {
  ChevronLeft, ChevronRight, Book, BoxArrowUpRight, GeoAltFill,
  HouseDoorFill, Tags, Database, Scissors, BoxSeamFill, GeoAlt, ClockHistory,
  CalendarCheck, Bell, PersonCircle, People, ShieldLock, Activity, PersonBadge,
} from 'react-bootstrap-icons';
import type { ReactElement } from 'react';
import type { Feature } from '@yorga/contracts';
import { useAuth } from '../auth/AuthContext';
import { useRrhh } from '../rrhh/RrhhContext';

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
import personasFichaImg from '../../assets/guia/cap-personas-ficha.png';
import personasImportarImg from '../../assets/guia/cap-personas-importar.png';
import personasMaestrosImg from '../../assets/guia/cap-personas-maestros.png';
import personasPermisosImg from '../../assets/guia/cap-personas-permisos.png';

/**
 * Guía de uso en formato «ebook»: capítulos con índice, imagen del módulo real y navegación anterior/siguiente.
 * A ancho completo (texto e imagen en dos columnas). El capítulo de Personas (RRHH) es el más detallado, con
 * sub-secciones, por ser el núcleo del día a día. Informativa (no toca datos) y visible para todos.
 */

interface Seccion {
  titulo: string;
  texto?: string;
  pasos?: string[];
  nota?: string;
  img?: string;
}

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
  secciones?: Seccion[];
  /** Ruta del módulo en el panel, para abrirlo directamente desde la guía. */
  ruta?: string;
  /** Permiso necesario para abrirlo (si aplica). */
  feature?: Feature;
  /** Si requiere tener ficha de empleado (módulo de Personas). */
  soloEmpleado?: boolean;
}

const CAPITULOS: Capitulo[] = [
  {
    id: 'bienvenida', grupo: 'Introducción', titulo: 'Cómo usar esta guía',
    intro:
      'Una referencia del panel, apartado por apartado: qué es cada cosa, qué puedes hacer y una imagen de cada pantalla. Puedes leerla entera o ir directamente a lo que necesites desde el índice.',
    notas: [
      'Avanza con «Anterior» y «Siguiente», o salta a cualquier apartado desde la lista de la izquierda.',
      'Cada capítulo indica para quién es y dónde está en el menú; con «Abrir» vas directamente a esa pantalla.',
      '«Personas» es el apartado más completo, por ser el de uso diario.',
    ],
  },
  {
    id: 'inicio', ruta: '/inicio', grupo: 'Empezar aquí', titulo: 'Inicio', menu: 'Inicio', quien: 'Para todo el mundo', img: inicioImg,
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
    id: 'etiquetas', ruta: '/etiquetas', feature: 'etiquetas.ver', grupo: 'Etiquetas y colección', titulo: 'Etiquetas', menu: 'Etiquetas y colección → Etiquetas', quien: 'Para el equipo de etiquetas', img: etiquetasImg,
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
    id: 'maestro', ruta: '/maestro', feature: 'maestro.ver', grupo: 'Etiquetas y colección', titulo: 'Base de datos (maestro)', menu: 'Etiquetas y colección → Base de datos', quien: 'Consulta: todo el equipo · Cargar datos: administración', img: maestroImg,
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
    id: 'poda', ruta: '/poda', feature: 'maestro.cargar', grupo: 'Etiquetas y colección', titulo: 'Podar SAP', menu: 'Etiquetas y colección → Podar SAP', quien: 'Para administración', img: podaImg,
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
    id: 'surtidos', ruta: '/surtidos', feature: 'maestro.cargar', grupo: 'Etiquetas y colección', titulo: 'Surtidos', menu: 'Etiquetas y colección → Surtidos', quien: 'Para administración', img: surtidosImg,
    intro: 'El catálogo de qué surtidos conservar por grupo de referencia cuando se poda.',
    acciones: [
      'Ver los surtidos por grupo (p. ej. chica 76 / chico 86).',
      'Añadir un código de surtido (3 caracteres) a un grupo.',
      'Quitar un surtido de un grupo.',
    ],
    notas: ['Solo tiene efecto al podar si allí marcas «Aplicar surtidos».'],
  },
  {
    id: 'destinos', ruta: '/destinos', feature: 'destinos.gestionar', grupo: 'Etiquetas y colección', titulo: 'Destinos', menu: 'Etiquetas y colección → Destinos', quien: 'Para quien gestiona los envíos', img: destinosImg,
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
    id: 'fichar', ruta: '/fichar', soloEmpleado: true, grupo: 'Personas (RRHH)', titulo: 'Fichar', menu: 'Personas → Fichar', quien: 'Para el personal', img: ficharImg,
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
    id: 'ausencias', ruta: '/ausencias', soloEmpleado: true, grupo: 'Personas (RRHH)', titulo: 'Ausencias y vacaciones', menu: 'Personas → Ausencias', quien: 'Para el personal (y quien aprueba)', img: ausenciasImg,
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
    id: 'avisos', ruta: '/avisos', soloEmpleado: true, grupo: 'Personas (RRHH)', titulo: 'Avisos', menu: 'Personas → Avisos', quien: 'Para el personal', img: avisosImg,
    intro: 'Las notificaciones del módulo de personal (solicitudes por aprobar, decisiones sobre tus ausencias…).',
    acciones: ['Ver tus avisos (los no leídos van marcados).', 'Marcar un aviso como leído.', 'Marcar todos como leídos.'],
    notas: ['El menú muestra un contador con los avisos sin leer.'],
  },
  {
    id: 'personas', ruta: '/personas', soloEmpleado: true, grupo: 'Personas (RRHH)', titulo: 'Personas', menu: 'Personas → Personas', quien: 'Consulta: el personal · Gestión: RRHH', img: personasImg,
    intro:
      'El núcleo del día a día: la gestión completa del personal del grupo. Aquí llevas la plantilla, la ficha de cada persona, el organigrama, el control de fichajes y los maestros de RRHH (empresas, zonas y convenios). Este capítulo lo vemos con más detalle por ser el que más se usa.',
    acciones: [
      'Buscar en la plantilla y ver la ficha de cada persona.',
      '(RRHH/Admin) Dar de alta, importar fichas, editar, dar de baja o reactivar.',
      'Ver el organigrama y exportar la plantilla a CSV.',
      '(RRHH/Admin) Gestionar empresas, zonas, convenios y los permisos de cada convenio.',
    ],
    secciones: [
      {
        titulo: '1. Importar las fichas desde Excel',
        texto: 'En vez de dar de alta a la gente una a una, sube tu Excel de RRHH (el de las 12 columnas) con el botón «Importar fichas». Verás un informe de creadas / actualizadas / saltadas, y podrás descargar un CSV con las contraseñas temporales de las altas nuevas.',
        pasos: [
          'Pulsa «Importar fichas» (arriba a la derecha) y elige el .xlsx.',
          'Revisa el informe: creadas, actualizadas y saltadas con su motivo.',
          'Descarga el CSV de credenciales para repartir las contraseñas temporales.',
        ],
        nota: 'Puedes reimportar el mismo archivo: no duplica. Cada ficha se reconoce por empresa + código, así que reimportar solo actualiza lo que cambió.',
        img: personasImportarImg,
      },
      {
        titulo: '2. La ficha de cada persona',
        texto: 'Pulsa una persona en la plantilla para abrir su ficha, a tamaño grande. Arriba sus datos generales (puesto, jornada, vacaciones, responsable, centro, departamento) y debajo el bloque de empresa: sociedad, código de empleado, DNI, categoría, tipo de contrato, sección y antigüedad.',
        nota: 'Al final de la ficha aparece «Permisos por convenio» (solo lectura): los permisos que le corresponden hoy según su zona y convenio. El distintivo «según convenio» significa que salen del convenio configurado; «catálogo global» significa que ese convenio aún no está relleno.',
        img: personasFichaImg,
      },
      {
        titulo: '3. Maestros: empresas, zonas y convenios',
        texto: 'En la pestaña «Maestros» gestionas la capa organizativa que usa RRHH: empresas (sociedades), zonas (cada una con su convenio), convenios, y los catálogos de categorías, contratos y secciones. A cada zona le asignas su convenio: así todas las personas de las tiendas de esa zona heredan ese convenio automáticamente.',
        nota: 'No podrás borrar una empresa, zona, convenio o catálogo que esté en uso: el sistema te avisa con cuántas personas o tiendas lo están usando, para no dejar fichas huérfanas.',
        img: personasMaestrosImg,
      },
      {
        titulo: '4. Definir los permisos de cada convenio',
        texto: 'Es la parte clave: decir qué permisos concede cada convenio. Desde «Maestros → Convenios», abre el editor de permisos de un convenio, marca los tipos de ausencia que concede e indica sus días máximos y si son remunerados. Eso es lo que verá cada trabajador en su ficha.',
        pasos: [
          'En «Maestros → Convenios», pulsa «Permisos» en el convenio.',
          'Marca los tipos de permiso que concede.',
          'Indica los días máximos y si es remunerado, y guarda.',
        ],
        nota: 'Mientras un convenio no tenga permisos definidos, el sistema usa el catálogo general como respaldo: puedes ir rellenando convenio a convenio a tu ritmo, sin que nada se rompa.',
        img: personasPermisosImg,
      },
    ],
    notas: [
      'Cada empleado se enlaza a un usuario que ya existe (por su correo). Si no existe, créalo antes en Usuarios.',
      'Los empleados se dan de baja/reactivan, no se borran.',
      'Este módulo tiene además una guía dedicada, paso a paso, pensada para RRHH.',
    ],
  },
  {
    id: 'usuarios', ruta: '/usuarios', feature: 'usuarios.gestionar', grupo: 'Administración', titulo: 'Usuarios', menu: 'Administración → Usuarios', quien: 'Para administración',
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
    id: 'roles', ruta: '/roles', feature: 'roles.gestionar', grupo: 'Administración', titulo: 'Roles', menu: 'Administración → Roles', quien: 'Para administración', img: rolesImg,
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
    id: 'actividad', ruta: '/actividad', feature: 'actividad.ver', grupo: 'Administración', titulo: 'Actividad', menu: 'Administración → Actividad', quien: 'Para administración', img: actividadImg,
    intro: 'El registro de auditoría: quién hizo qué sobre usuarios, roles, destinos y las cargas del maestro.',
    acciones: [
      'Ver los movimientos con fecha, usuario, acción y resumen.',
      'Abrir el detalle de un cambio (comparativa «antes → después»).',
      'Filtrar y ordenar el registro.',
    ],
    notas: ['El registro es inmutable: no se puede editar ni borrar.'],
  },
];

// Icono por módulo (los mismos del menú, para que se reconozcan de un vistazo).
const ICONOS: Record<string, ReactElement> = {
  bienvenida: <Book />,
  inicio: <HouseDoorFill />,
  etiquetas: <Tags />,
  maestro: <Database />,
  poda: <Scissors />,
  surtidos: <BoxSeamFill />,
  destinos: <GeoAlt />,
  fichar: <ClockHistory />,
  ausencias: <CalendarCheck />,
  avisos: <Bell />,
  personas: <PersonCircle />,
  usuarios: <People />,
  roles: <ShieldLock />,
  actividad: <Activity />,
};

function Figura({ src, titulo }: { src: string; titulo: string }) {
  return (
    <figure className="mb-0">
      <img
        src={src}
        alt={`Captura de ${titulo}`}
        className="w-100"
        style={{ height: 'auto', borderRadius: 12, border: '1px solid var(--bs-border-color, #dee2e6)', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}
      />
    </figure>
  );
}

function Nota({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded" style={{ background: 'var(--bs-secondary-bg, #f1f3f5)' }}>
      <div className="text-uppercase small fw-semibold mb-1" style={{ letterSpacing: '.06em' }}>Ten en cuenta</div>
      <div className="text-secondary mb-0">{children}</div>
    </div>
  );
}

const STORAGE_KEY = 'guia-capitulo';

export function GuiaPage() {
  // Recuerda por dónde iba el usuario (si el índice guardado ya no existe, empieza de cero).
  const [idx, setIdx] = useState(() => {
    try {
      const n = Number(localStorage.getItem(STORAGE_KEY));
      return Number.isInteger(n) && n >= 0 && n < CAPITULOS.length ? n : 0;
    } catch {
      return 0;
    }
  });
  const topRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLElement>(null);
  const cap = CAPITULOS[idx];
  const prev = idx > 0 ? CAPITULOS[idx - 1] : null;
  const next = idx < CAPITULOS.length - 1 ? CAPITULOS[idx + 1] : null;
  const { hasFeature } = useAuth();
  const { esEmpleado } = useRrhh();

  // ¿El usuario puede abrir el módulo de este capítulo? (respeta permiso y ficha de empleado).
  const puedeAbrir = (c: Capitulo) => !!c.ruta && (!c.feature || hasFeature(c.feature)) && (!c.soloEmpleado || esEmpleado);

  const ir = (n: number) => setIdx(Math.max(0, Math.min(CAPITULOS.length - 1, n)));

  // Al cambiar de capítulo: subir al principio, recordar la posición y mantener el índice a la vista.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { localStorage.setItem(STORAGE_KEY, String(idx)); } catch { /* almacenamiento no disponible */ }
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  // Navegación con las flechas del teclado (← anterior / → siguiente), salvo si se escribe en un campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(CAPITULOS.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    <div className="page page-full" ref={topRef}>
      <header className="page-head mb-4 d-flex align-items-center gap-2">
        <Book className="text-secondary" size={22} />
        <div>
          <h1 className="h4 mb-1">Guía de uso</h1>
          <p className="text-secondary mb-0">Manual del panel, módulo a módulo. Léelo como un libro o salta por el índice.</p>
        </div>
      </header>

      {/* Progreso de lectura */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <ProgressBar now={((idx + 1) / CAPITULOS.length) * 100} style={{ height: 6, flex: 1 }} aria-label="Progreso de la guía" />
        <span className="text-secondary small flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {CAPITULOS.length}</span>
      </div>

      {/* Selector de capítulo (solo móvil / pantallas pequeñas) */}
      <Form.Select
        className="d-lg-none mb-3"
        aria-label="Elegir capítulo"
        value={idx}
        onChange={(e) => ir(Number(e.target.value))}
      >
        {CAPITULOS.map((c, i) => (
          <option key={c.id} value={i}>{String(i).padStart(2, '0')} · {c.titulo}</option>
        ))}
      </Form.Select>

      <div className="d-flex flex-column flex-lg-row gap-4 align-items-start">
        {/* Índice */}
        <nav aria-label="Índice de la guía" className="d-none d-lg-block" style={{ flex: '0 0 auto', width: '100%', maxWidth: 300 }}>
          <div style={{ position: 'sticky', top: 16 }}>
            {grupos.map((g) => (
              <div key={g.grupo} className="mb-3">
                <div className="text-uppercase text-secondary small fw-semibold mb-1" style={{ letterSpacing: '.06em' }}>{g.grupo}</div>
                <ListGroup variant="flush">
                  {g.items.map(({ i, c }) => (
                    <ListGroup.Item
                      key={c.id} action active={i === idx} onClick={() => setIdx(i)}
                      ref={i === idx ? (activeItemRef as never) : undefined}
                      className="d-flex align-items-center gap-2 border-0 rounded px-2 py-1" style={{ cursor: 'pointer' }}
                    >
                      <span className={`d-inline-flex ${i === idx ? '' : 'text-brand'}`} aria-hidden="true">{ICONOS[c.id]}</span>
                      <span>{c.titulo}</span>
                      {puedeAbrir(c) && (
                        <Link
                          to={c.ruta!}
                          onClick={(e) => e.stopPropagation()}
                          className={`ms-auto d-inline-flex ${i === idx ? 'text-white' : 'text-secondary'}`}
                          title={`Abrir ${c.titulo}`}
                          aria-label={`Abrir ${c.titulo}`}
                        >
                          <BoxArrowUpRight size={13} />
                        </Link>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            ))}
          </div>
        </nav>

        {/* Lector — ocupa el resto del ancho */}
        <article className="flex-grow-1" style={{ minWidth: 0, width: '100%' }}>
          <Card>
            <Card.Body className="p-4 p-md-5">
              <div className="text-uppercase small fw-semibold mb-2" style={{ letterSpacing: '.08em', color: 'var(--bs-secondary-color, #6c757d)' }}>
                {idx === 0 ? 'Introducción' : `Capítulo ${idx} · ${cap.grupo}`}
              </div>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                  <span
                    className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--kpi-bg)', color: 'var(--brand)', fontSize: 22 }}
                    aria-hidden="true"
                  >
                    {ICONOS[cap.id]}
                  </span>
                  <h2 className="mb-0">{cap.titulo}</h2>
                </div>
                {cap.ruta && (
                  puedeAbrir(cap) ? (
                    <Link to={cap.ruta} className="btn btn-brand flex-shrink-0">
                      Abrir {cap.titulo} <BoxArrowUpRight className="ms-1" />
                    </Link>
                  ) : (
                    <Badge bg="secondary-subtle" text="secondary" className="flex-shrink-0 align-self-center" style={{ whiteSpace: 'normal' }}>
                      No tienes acceso a este módulo
                    </Badge>
                  )
                )}
              </div>

              {(cap.quien || cap.menu) && (
                <div className="d-flex flex-wrap align-items-center gap-3 mb-4 text-secondary small">
                  {cap.quien && (
                    <span className="d-inline-flex align-items-center gap-1">
                      <PersonBadge aria-hidden="true" /> <strong className="fw-semibold text-body">{cap.quien}</strong>
                    </span>
                  )}
                  {cap.menu && (
                    <span className="d-inline-flex align-items-center gap-1">
                      <GeoAltFill aria-hidden="true" /> En el menú: <strong className="fw-semibold text-body">{cap.menu}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Intro + acciones a la izquierda, imagen a la derecha (a ancho completo en pantallas grandes) */}
              <div className="row g-4 align-items-start">
                <div className={cap.img ? 'col-lg-6' : 'col-12'} style={{ maxWidth: cap.img ? undefined : '72ch' }}>
                  <p className="fs-5">{cap.intro}</p>
                  {cap.acciones && cap.acciones.length > 0 && (
                    <>
                      <h3 className="h6 fw-semibold mt-4 mb-2">Qué puedes hacer</h3>
                      <ul className="ps-3 mb-0">
                        {cap.acciones.map((a, i) => <li key={i} className="mb-2">{a}</li>)}
                      </ul>
                    </>
                  )}
                  {cap.notas && cap.notas.length > 0 && (
                    <Nota>
                      <ul className="ps-3 mb-0">{cap.notas.map((n, i) => <li key={i} className="mb-1">{n}</li>)}</ul>
                    </Nota>
                  )}
                </div>
                {cap.img && (
                  <div className="col-lg-6">
                    <Figura src={cap.img} titulo={cap.titulo} />
                    <figcaption className="text-secondary small mt-2">Así se ve «{cap.titulo}» en el panel.</figcaption>
                  </div>
                )}
              </div>

              {/* Sub-secciones detalladas (Personas): texto + imagen alternando */}
              {cap.secciones && cap.secciones.map((s, si) => (
                <section key={si} className="mt-5 pt-4" style={{ borderTop: '1px solid var(--bs-border-color, #dee2e6)' }}>
                  <h3 className="h5 mb-3">{s.titulo}</h3>
                  <div className="row g-4 align-items-start">
                    <div className="col-lg-6">
                      {s.texto && <p>{s.texto}</p>}
                      {s.pasos && s.pasos.length > 0 && (
                        <ol className="ps-3 mb-0">{s.pasos.map((p, pi) => <li key={pi} className="mb-2">{p}</li>)}</ol>
                      )}
                      {s.nota && <Nota>{s.nota}</Nota>}
                    </div>
                    {s.img && (
                      <div className="col-lg-6"><Figura src={s.img} titulo={s.titulo} /></div>
                    )}
                  </div>
                </section>
              ))}
            </Card.Body>
          </Card>

          {/* Navegación anterior / siguiente (con el nombre del capítulo) */}
          <div className="d-flex justify-content-between align-items-stretch gap-2 mt-3">
            <Button variant="outline-secondary" className="text-start" disabled={!prev} onClick={() => ir(idx - 1)} style={{ maxWidth: '47%' }}>
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <ChevronLeft className="flex-shrink-0" />
                <span style={{ minWidth: 0 }}>
                  <span className="d-block small text-secondary">Anterior</span>
                  <span className="d-block text-truncate">{prev?.titulo ?? '—'}</span>
                </span>
              </div>
            </Button>
            <span className="text-secondary small d-none d-sm-flex align-items-center text-nowrap px-2">Usa ← → para navegar</span>
            <Button variant="outline-secondary" className="text-end" disabled={!next} onClick={() => ir(idx + 1)} style={{ maxWidth: '47%' }}>
              <div className="d-flex align-items-center justify-content-end gap-2" style={{ minWidth: 0 }}>
                <span style={{ minWidth: 0 }}>
                  <span className="d-block small text-secondary">Siguiente</span>
                  <span className="d-block text-truncate">{next?.titulo ?? '—'}</span>
                </span>
                <ChevronRight className="flex-shrink-0" />
              </div>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
