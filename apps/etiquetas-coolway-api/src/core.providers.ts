import { Provider } from '@nestjs/common';
import { ORDER_READER, OrderReaderPort } from './application/ports/order-reader.port';
import { MASTER_PROVIDER, MasterProvider } from './application/ports/master-provider.port';
import { GENERATE_LABELS_USE_CASE } from './application/tokens';
import { GenerateLabelsUseCase } from './application/use-cases/generate-labels.use-case';
import { PdfOrderReader } from './infrastructure/pdf/pdf-order-reader.adapter';
import { ExcelMasterReader } from './infrastructure/excel/excel-master-reader.adapter';
import { LabelExcelSerializer } from './infrastructure/excel/label-excel-serializer';
import { PrismaService } from './infrastructure/db/prisma.service';
import { DbMasterReader } from './infrastructure/db/db-master-reader';
import { DefaultMasterProvider } from './infrastructure/master/default-master-provider';
import { DESTINATION_REPOSITORY } from './destinos/application/ports';
import { DestinationsService } from './destinos/application/destinations.service';
import { ACTIVITY_RECORDER } from './actividad/application/activity-recorder.port';
import { PrismaActivityRecorder } from './actividad/infrastructure/prisma-activity-recorder';
import { PrismaDestinationRepository } from './destinos/infrastructure/prisma-destination.repository';
import { SURTIDO_REPOSITORY } from './surtidos/application/ports';
import { SurtidosService } from './surtidos/application/surtidos.service';
import { PrismaSurtidoRepository } from './surtidos/infrastructure/prisma-surtido.repository';
import { ABSENCE_REPOSITORY, ABSENCE_TYPE_REPOSITORY, EMPLOYEE_REPOSITORY, RRHH_STRUCTURE_REPOSITORY, TIME_ENTRY_REPOSITORY } from './rrhh/application/ports';
import { RRHH_ACTIVITY_RECORDER } from './rrhh/application/rrhh-activity.port';
import { RrhhService } from './rrhh/application/rrhh.service';
import { RrhhStructureService } from './rrhh/application/rrhh-structure.service';
import { FichajeService } from './rrhh/application/fichaje.service';
import { AusenciaService } from './rrhh/application/ausencia.service';
import { RrhhGuard } from './rrhh/interface/http/rrhh.guard';
import { PrismaEmployeeRepository } from './rrhh/infrastructure/prisma-employee.repository';
import { PrismaStructureRepository } from './rrhh/infrastructure/prisma-structure.repository';
import { PrismaTimeEntryRepository } from './rrhh/infrastructure/prisma-time-entry.repository';
import { PrismaAbsenceRepository, PrismaAbsenceTypeRepository } from './rrhh/infrastructure/prisma-absence.repository';
import { PrismaRrhhActivityRecorder } from './rrhh/infrastructure/prisma-rrhh-activity.recorder';

/**
 * Proveedores comunes (hexágono) que comparten la CLI y la API HTTP:
 * liga puertos → adapters, arma el caso de uso y expone el serializador.
 * El maestro se carga desde BD (Postgres) o desde un Excel, según MasterSource.
 * Los destinos (REQ-004) también salen de la BD: los comparten la CLI y la web.
 */
export const coreProviders: Provider[] = [
  PrismaService,
  PdfOrderReader,
  ExcelMasterReader,
  DbMasterReader,
  LabelExcelSerializer,
  { provide: ORDER_READER, useExisting: PdfOrderReader },
  { provide: MASTER_PROVIDER, useClass: DefaultMasterProvider },
  PrismaDestinationRepository,
  { provide: DESTINATION_REPOSITORY, useExisting: PrismaDestinationRepository },
  PrismaActivityRecorder,
  { provide: ACTIVITY_RECORDER, useExisting: PrismaActivityRecorder },
  DestinationsService,
  PrismaSurtidoRepository,
  { provide: SURTIDO_REPOSITORY, useExisting: PrismaSurtidoRepository },
  SurtidosService,
  PrismaEmployeeRepository,
  { provide: EMPLOYEE_REPOSITORY, useExisting: PrismaEmployeeRepository },
  PrismaStructureRepository,
  { provide: RRHH_STRUCTURE_REPOSITORY, useExisting: PrismaStructureRepository },
  PrismaTimeEntryRepository,
  { provide: TIME_ENTRY_REPOSITORY, useExisting: PrismaTimeEntryRepository },
  PrismaAbsenceTypeRepository,
  { provide: ABSENCE_TYPE_REPOSITORY, useExisting: PrismaAbsenceTypeRepository },
  PrismaAbsenceRepository,
  { provide: ABSENCE_REPOSITORY, useExisting: PrismaAbsenceRepository },
  PrismaRrhhActivityRecorder,
  { provide: RRHH_ACTIVITY_RECORDER, useExisting: PrismaRrhhActivityRecorder },
  RrhhService,
  RrhhStructureService,
  FichajeService,
  AusenciaService,
  RrhhGuard,
  {
    provide: GENERATE_LABELS_USE_CASE,
    useFactory: (order: OrderReaderPort, master: MasterProvider) => new GenerateLabelsUseCase(order, master),
    inject: [ORDER_READER, MASTER_PROVIDER],
  },
];
