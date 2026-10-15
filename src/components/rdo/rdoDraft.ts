import { DailyLog, Project } from '../../types';
import { categoryOption } from './rdoOptions';

export type RdoDraft = Pick<
  DailyLog,
  | 'projectId'
  | 'rdoNumber'
  | 'executionDate'
  | 'engineerInCharge'
  | 'creaArt'
  | 'weatherMorning'
  | 'weatherAfternoon'
  | 'workforce'
  | 'equipment'
  | 'tasks'
  | 'photos'
  | 'generalNotes'
  | 'occurrences'
  | 'safetyAccidents'
  | 'safetyNotes'
  | 'digitalSignature'
>;

/** RDO being filled, kept in IndexedDB so a page reload doesn't lose it. */
export interface SavedRdoDraft {
  draft: RdoDraft;
  step: number;
  initialLogId: string | null;
}

export const NO_OCCURRENCES_TEXT = 'Sem ocorrências no dia.';

export const hasRealOccurrence = (text: string) => text.trim() !== '' && !/^sem ocorr/i.test(text.trim());

export function createDraft(initialLog: DailyLog | null | undefined, projects: Project[], nextRdoNumber: number): RdoDraft {
  if (initialLog) {
    return {
      projectId: initialLog.projectId,
      rdoNumber: initialLog.rdoNumber,
      executionDate: initialLog.executionDate,
      engineerInCharge: initialLog.engineerInCharge,
      creaArt: initialLog.creaArt || '',
      weatherMorning: initialLog.weatherMorning,
      weatherAfternoon: initialLog.weatherAfternoon,
      workforce: initialLog.workforce,
      equipment: initialLog.equipment,
      tasks: initialLog.tasks,
      photos: initialLog.photos,
      generalNotes: initialLog.generalNotes,
      occurrences: initialLog.occurrences,
      safetyAccidents: initialLog.safetyAccidents,
      safetyNotes: initialLog.safetyNotes || '',
      digitalSignature: initialLog.digitalSignature,
    };
  }

  const project = projects[0];
  return {
    projectId: project?.id || '',
    rdoNumber: nextRdoNumber,
    executionDate: new Date().toISOString().split('T')[0],
    engineerInCharge: project?.engineerInCharge || '',
    creaArt: project?.artRrt || '',
    weatherMorning: 'ensolarado',
    weatherAfternoon: 'ensolarado',
    workforce: [],
    equipment: [],
    tasks: [],
    photos: [],
    generalNotes: '',
    occurrences: NO_OCCURRENCES_TEXT,
    safetyAccidents: false,
    safetyNotes: '',
    digitalSignature: undefined,
  };
}

/** Converts the draft into the DailyLog used by storage, PDF and OneDrive sync. */
export function draftToLog(
  draft: RdoDraft,
  initialLog: DailyLog | null | undefined,
  projects: Project[],
  currentUserEmail: string
): DailyLog {
  const project = projects.find((p) => p.id === draft.projectId);
  const now = new Date().toISOString();

  return {
    ...draft,
    id: initialLog?.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectName: project?.name || 'Obra',
    date: initialLog?.date || now.split('T')[0],
    workforce: draft.workforce.filter((w) => w.count > 0 && w.role.trim() !== ''),
    equipment: draft.equipment.filter((e) => e.count > 0),
    tasks: draft.tasks.map((t) => ({
      ...t,
      description: t.description.trim() || categoryOption(t.category).label,
    })),
    occurrences: draft.occurrences.trim() || NO_OCCURRENCES_TEXT,
    safetyNotes: draft.safetyAccidents ? draft.safetyNotes : '',
    status: 'aprovado',
    syncStatus: 'pending', // any local save must be sent to the cloud again
    exportedPdfName: initialLog?.exportedPdfName,
    drivePdfId: initialLog?.drivePdfId,
    drivePdfLink: initialLog?.drivePdfLink,
    createdAt: initialLog?.createdAt || now,
    updatedAt: now,
    createdByEmail: currentUserEmail,
  };
}
