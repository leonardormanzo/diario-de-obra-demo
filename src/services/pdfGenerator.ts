import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyLog, Project } from '../types';
import { BRAND } from '../brand';

/**
 * Sanitizes a string for safe use in file names.
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Formats the PDF name per user requirements:
 * [Nome da Obra]_[Data de Execução]_[Responsável].pdf
 */
export function generatePdfFileName(log: DailyLog, project?: Project): string {
  const obra = sanitizeFileName(project?.name || log.projectName || 'Obra');
  const data = sanitizeFileName(log.executionDate || log.date || new Date().toISOString().split('T')[0]);
  const resp = sanitizeFileName(log.engineerInCharge || 'Engenheiro');
  return `Diario_${obra}_${data}_${resp}.pdf`;
}

/**
 * Builds the official PDF Document using jsPDF.
 */
export async function generateDailyLogPdf(log: DailyLog, project?: Project): Promise<{ blob: Blob; fileName: string; doc: jsPDF }> {
  const fileName = generatePdfFileName(log, project);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header banner (deep charcoal)
  doc.setFillColor(18, 18, 20); // charcoal
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent bar (gold)
  doc.setFillColor(197, 160, 89); // gold
  doc.rect(0, 28, pageWidth, 3, 'F');

  // Header Title & Logo typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(BRAND.company.toUpperCase(), margin, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(197, 160, 89); // gold
  doc.text('RELATÓRIO DIÁRIO DE OBRA (RDO)', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`RDO Nº: #${String(log.rdoNumber).padStart(4, '0')}  |  Data de Execução: ${log.executionDate}`, margin, 24);
  doc.text(`Emitido: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - margin - 50, 24);

  let currentY = 36;

  // 1. Dados da Obra e Responsabilidade
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('1. DADOS DA OBRA & RESPONSABILIDADE TÉCNICA', margin, currentY);
  currentY += 4;

  const infoData = [
    [
      { content: 'Obra / Projeto:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: project?.name || log.projectName },
      { content: 'Data do Registro:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: log.date },
    ],
    [
      { content: 'Responsável Técnico:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: log.engineerInCharge },
      { content: 'ART / RRT:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: project?.artRrt || log.creaArt || 'Conforme projeto' },
    ],
    [
      { content: 'Cliente / Contratante:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: project?.clientName || 'Cliente Confidencial' },
      { content: 'Status do Diário:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: log.status === 'aprovado' ? 'APROVADO TÉCNICO' : 'RASCUNHO OFICIAL' },
    ],
    [
      { content: 'Endereço da Obra:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: project?.address || 'Canteiro Principal', colSpan: 3 },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: infoData as any,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Condições Climáticas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. CONDIÇÕES CLIMÁTICAS & PRATICABILIDADE', margin, currentY);
  currentY += 4;

  const weatherLabel = (cond: string) => {
    switch (cond) {
      case 'ensolarado': return 'Ensolarado / Estável';
      case 'nublado': return 'Nublado / Seco';
      case 'chuvoso': return 'Chuvoso / Úmido';
      case 'impraticavel': return 'Chuva Forte / Impraticável';
      default: return cond;
    }
  };

  const isImpraticavel = log.weatherMorning === 'impraticavel' || log.weatherAfternoon === 'impraticavel';

  const weatherData = [
    [
      { content: 'Período Matutino (Manhã):', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: weatherLabel(log.weatherMorning) },
      { content: 'Período Vespertino (Tarde):', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: weatherLabel(log.weatherAfternoon) },
    ],
    [
      { content: 'Condição de Trabalho:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: isImpraticavel ? 'Parcialmente Interrompido por Chuva' : 'Praticável em Turno Integral', colSpan: 3 },
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    body: weatherData as any,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2 },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. Efetivo e Equipamentos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. EFETIVO DE MÃO DE OBRA E EQUIPAMENTOS', margin, currentY);
  currentY += 4;

  const workforceRows = (log.workforce || []).map(w => [
    w.role,
    `${w.count} profissional(is)`,
    w.company || 'Próprio'
  ]);

  if (workforceRows.length === 0) {
    workforceRows.push(['Equipe geral', '1', 'Próprio']);
  }

  const equipmentText = (log.equipment || [])
    .map(e => `${e.name} (Qtd: ${e.count}${e.operational ? '' : ' - Em Manutenção'})`)
    .join(', ') || 'Equipamentos manuais e ferramentas padrão';

  autoTable(doc, {
    startY: currentY,
    head: [['Função / Especialidade', 'Quantidade', 'Empresa / Empreiteira']],
    body: workforceRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 2;

  // Equipamentos row
  autoTable(doc, {
    startY: currentY,
    body: [[
      { content: 'Equipamentos & Máquinas em Uso:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 60 } },
      { content: equipmentText }
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Check page break before tasks
  if (currentY > 220) {
    doc.addPage();
    currentY = 18;
  }

  // 4. Atividades e Status das Tarefas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. STATUS E EXECUÇÃO DAS TAREFAS POR DISCIPLINA', margin, currentY);
  currentY += 4;

  const formatStatus = (st: string) => {
    switch (st) {
      case 'concluida': return 'CONCLUÍDA (100%)';
      case 'em_andamento': return 'EM ANDAMENTO';
      case 'pendente': return 'PENDENTE';
      case 'bloqueada': return 'BLOQUEADA';
      default: return st.toUpperCase();
    }
  };

  const taskRows = (log.tasks || []).map((t, idx) => [
    `${idx + 1}`,
    t.description,
    t.category || 'Geral',
    formatStatus(t.status),
    `${t.progress}%`,
    t.deadline ? `Prazo: ${t.deadline.split('-').reverse().join('/')}` : '-',
    t.observations || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Descrição da Atividade', 'Categoria', 'Status', 'Prog.', 'Prazo Limite', 'Observações Técnicas']],
    body: taskRows.length > 0 ? taskRows : [['1', 'Acompanhamento rotineiro das frentes de serviço', 'Geral', 'EM ANDAMENTO', '50%', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 50 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 14 },
      5: { cellWidth: 22 },
      6: { cellWidth: 37 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 5. Ocorrências & Observações
  if (currentY > 225) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. OCORRÊNCIAS, SEGURANÇA E NOTAS DO DIA', margin, currentY);
  currentY += 4;

  const notesBody = [
    [
      { content: 'Descritivo do Dia:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 } },
      { content: log.generalNotes || 'Nenhuma ressalva adicional no período de execução.' }
    ],
    [
      { content: 'Ocorrências / Desvios:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: log.occurrences || 'Sem ocorrências anormais registradas.' }
    ],
    [
      { content: 'Segurança do Trabalho (SST):', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: log.safetyAccidents ? `ATENÇÃO: Acidente/Incidente registrado! Detalhes: ${log.safetyNotes || 'Ver relatório SST'}` : 'Zero acidentes no período. EPIs e EPCs em conformidade com as NRs.' }
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    body: notesBody as any,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 6. Registro Fotográfico (Fotos do dia)
  if (log.photos && log.photos.length > 0) {
    // Photos section starts on fresh page if space is low
    if (currentY > 180) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`6. REGISTRO FOTOGRÁFICO DE EVIDÊNCIAS (${log.photos.length} fotos anexadas)`, margin, currentY);
    currentY += 6;

    const photoWidth = 85;
    const photoHeight = 64;
    let col = 0;

    for (let i = 0; i < log.photos.length; i++) {
      const photo = log.photos[i];
      if (currentY + photoHeight + 16 > pageHeight - margin) {
        doc.addPage();
        currentY = 18;
        col = 0;
      }

      const xPos = col === 0 ? margin : margin + photoWidth + 12;

      try {
        if (photo.url && photo.url.startsWith('data:image')) {
          // Fit the photo inside the frame keeping its proportions (phone photos are often portrait).
          const props = doc.getImageProperties(photo.url);
          const fit = Math.min(photoWidth / props.width, photoHeight / props.height);
          const drawW = props.width * fit;
          const drawH = props.height * fit;
          doc.setFillColor(15, 23, 42);
          doc.rect(xPos, currentY, photoWidth, photoHeight, 'F');
          doc.addImage(
            photo.url,
            props.fileType,
            xPos + (photoWidth - drawW) / 2,
            currentY + (photoHeight - drawH) / 2,
            drawW,
            drawH,
            undefined,
            'FAST'
          );
        } else {
          doc.setFillColor(226, 232, 240);
          doc.rect(xPos, currentY, photoWidth, photoHeight, 'F');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('[Foto da Obra]', xPos + 25, currentY + 25);
        }

        // Caption box
        doc.setFillColor(241, 245, 249);
        doc.rect(xPos, currentY + photoHeight, photoWidth, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        const captionLine = doc.splitTextToSize(`[${photo.tag}] ${photo.caption || 'Registro da etapa'}`, photoWidth - 4)[0];
        doc.text(captionLine, xPos + 2, currentY + photoHeight + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Horário: ${photo.timestamp || log.executionDate}`, xPos + 2, currentY + photoHeight + 8);
      } catch (err) {
        console.warn('Erro ao inserir foto no PDF:', err);
      }

      col++;
      if (col >= 2) {
        col = 0;
        currentY += photoHeight + 14;
      }
    }

    if (col !== 0) {
      currentY += photoHeight + 14;
    }
  }

  // 7. Assinaturas Técnicas
  const sigHeight = log.digitalSignature ? 32 : 22;
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY = Math.max(currentY + 6, pageHeight - 50);
  }

  const signWidth = 78;

  // Left sign: Engenheiro Responsável
  if (log.digitalSignature && log.digitalSignature.signatureDataUrl) {
    try {
      // Draw signature image
      doc.addImage(
        log.digitalSignature.signatureDataUrl,
        'PNG',
        margin + 10,
        currentY - 2,
        signWidth - 20,
        14,
        undefined,
        'FAST'
      );
    } catch (e) {
      console.warn('Erro ao inserir assinatura:', e);
    }
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, currentY + 12, margin + 5 + signWidth, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(log.engineerInCharge, margin + 5 + signWidth / 2, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Engenheiro Responsável (${project?.artRrt || 'CREA Ativo'})`, margin + 5 + signWidth / 2, currentY + 19, { align: 'center' });

  if (log.digitalSignature) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`[ASSINADO DIGITALMENTE EM ${new Date(log.digitalSignature.signedAt).toLocaleString('pt-BR')}]`, margin + 5 + signWidth / 2, currentY + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Hash de Autenticidade: ${log.digitalSignature.verificationHash}`, margin + 5 + signWidth / 2, currentY + 26, { align: 'center' });
  }

  // Right sign: Fiscalização / Cliente
  const rightX = pageWidth - margin - signWidth - 5;
  doc.line(rightX, currentY + 12, rightX + signWidth, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(project?.clientName || 'Cliente / Fiscalização da Obra', rightX + signWidth / 2, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Aprovação & Acompanhamento de Obra', rightX + signWidth / 2, currentY + 19, { align: 'center' });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${BRAND.pdfFooter ? `${BRAND.pdfFooter} • ` : ''}Página ${i} de ${totalPages} • Arquivo: ${fileName}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const blob = doc.output('blob');
  return { blob, fileName, doc };
}

/**
 * Triggers a browser download of the PDF.
 */
export async function downloadDailyLogPdf(log: DailyLog, project?: Project): Promise<string> {
  const { blob, fileName } = await generateDailyLogPdf(log, project);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return fileName;
}
