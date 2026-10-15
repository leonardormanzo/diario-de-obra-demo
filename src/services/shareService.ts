import { DailyLog, Project } from '../types';
import { downloadDailyLogPdf, generateDailyLogPdf } from './pdfGenerator';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Sends the RDO PDF through the phone's share sheet (WhatsApp, e-mail, ...).
 * Falls back to a normal download where file sharing is not supported (desktop).
 */
export async function shareDailyLogPdf(log: DailyLog, project?: Project): Promise<ShareResult> {
  const { blob, fileName } = await generateDailyLogPdf(log, project);
  const file = new File([blob], fileName, { type: 'application/pdf' });

  const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  if (!canShareFiles) {
    await downloadDailyLogPdf(log, project);
    return 'downloaded';
  }

  try {
    await navigator.share({
      files: [file],
      title: `RDO nº ${log.rdoNumber}`,
      text: `RDO nº ${log.rdoNumber} • ${log.projectName} • ${log.executionDate.split('-').reverse().join('/')}`,
    });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    // Browser refused (e.g. the tap was too long ago): keep the user's work by downloading.
    console.error('Falha ao compartilhar, baixando o PDF:', error);
    await downloadDailyLogPdf(log, project);
    return 'downloaded';
  }
}
