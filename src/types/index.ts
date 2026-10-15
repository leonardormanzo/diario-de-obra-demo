/** Access levels: coordenador sees/edits everything, engenheiro only their obras, cliente only views. */
export type UserRole = 'coordenador' | 'engenheiro' | 'cliente';

/** Signed-in user, as returned by the server. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Obras assigned to the user (empty for coordenador, who sees all). */
  projectIds: string[];
}

/** An access account as managed by the coordinator. */
export interface ManagedUser extends AuthUser {
  active: boolean;
}

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada';
export type TaskPriority = 'alta' | 'media' | 'baixa';

export interface SiteTask {
  id: string;
  description: string;
  category: string; // e.g., 'Concreto / Estrutura', 'Elétrica', 'Hidráulica', 'Alvenaria', 'Acabamento', etc.
  status: TaskStatus;
  progress: number; // 0 - 100
  assignedTo?: string;
  deadline?: string; // YYYY-MM-DD
  priority?: TaskPriority;
  observations?: string;
}

export type WeatherCondition = 'ensolarado' | 'nublado' | 'chuvoso' | 'impraticavel';

export interface WorkforceEntry {
  id: string;
  role: string;
  count: number;
  company?: string;
}

export interface EquipmentEntry {
  id: string;
  name: string;
  count: number;
  operational: boolean;
  notes?: string;
}

export interface PhotoRecord {
  id: string;
  url: string; // base64 data URL
  caption: string;
  tag: 'Estrutura' | 'Alvenaria' | 'Instalações' | 'Acabamento' | 'Segurança' | 'Geral';
  timestamp: string;
}

export type SyncStatus = 'synced' | 'pending' | 'offline_draft' | 'failed';

export interface DigitalSignature {
  signatureDataUrl: string; // Base64 PNG drawn on canvas
  signerName: string;
  signerEmail: string;
  signerRole: string; // e.g. "Engenheiro Responsável Técnico"
  creaArt?: string;
  signedAt: string; // ISO string
  verificationHash: string; // SHA or unique verification token
}

export interface DailyLog {
  id: string;
  projectId: string;
  projectName: string;
  rdoNumber: number;
  date: string; // YYYY-MM-DD
  executionDate: string; // Date of work execution
  engineerInCharge: string;
  creaArt?: string;
  
  // Weather
  weatherMorning: WeatherCondition;
  weatherAfternoon: WeatherCondition;
  
  // Resources
  workforce: WorkforceEntry[];
  equipment: EquipmentEntry[];
  
  // Work Items
  tasks: SiteTask[];
  
  // Text Notes
  generalNotes: string;
  occurrences: string;
  safetyAccidents: boolean;
  safetyNotes?: string;
  
  // Photos
  photos: PhotoRecord[];
  
  // Digital Signature
  digitalSignature?: DigitalSignature;
  
  // Status & Cloud Sync
  status: 'rascunho' | 'aprovado';
  syncStatus: SyncStatus;
  syncError?: string;
  lastSyncedAt?: string;
  
  // Cloud storage & PDF (legacy field names kept for saved-data compatibility)
  drivePdfId?: string;
  drivePdfLink?: string;
  exportedPdfName?: string;
  
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  address: string;
  artRrt: string;
  engineerInCharge: string;
  engineerEmail: string;
  clientName: string;
  clientEmail: string;
  startDate: string;
  expectedEndDate: string;
  progressPercent: number;
  status: 'em_andamento' | 'concluido' | 'pausado';
  /** Local change not yet sent to the cloud. */
  needsSync?: boolean;
  driveFolderId?: string;
  driveFolderLink?: string;
  budgetTotal?: number;
  description?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'pendencia' | 'sync' | 'alerta' | 'info';
  date: string;
  read: boolean;
  projectId?: string;
}
