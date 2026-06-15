import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import { computeAlerts } from './scurve';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function isLeaf(task: Task, tasks: Task[]) {
  return !tasks.some((t) => t.parentId === task.id);
}

function getOuvrageProgress(tasks: Task[], ouvrageId: number): number {
  function isDesc(t: Task): boolean {
    let cur: Task | undefined = t;
    while (cur) {
      if (cur.id === ouvrageId) return true;
      cur = tasks.find((x) => x.id === cur!.parentId);
    }
    return false;
  }
  const leaves = tasks.filter((t) => isLeaf(t, tasks) && isDesc(t));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length);
}

function getGlobalProgress(tasks: Task[]): number {
  const leaves = tasks.filter((t) => isLeaf(t, tasks));
  if (!leaves.length) return 0;
  return Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length);
}

function getOuvrageName(task: Task, tasks: Task[]): string {
  let cur: Task | undefined = task;
  while (cur) {
    const o = OUVRAGES.find((o) => o.id === cur!.id);
    if (o) return o.nom.split(' - ')[0];
    cur = tasks.find((t) => t.id === cur!.parentId);
  }
  return '—';
}

export function generatePDFReport(tasks: Task[], userName: string) {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const today = new Date();
  const dateStr = format(today, 'dd MMMM yyyy', { locale: fr });
  const weekStr = format(today, "'Semaine' w yyyy", { locale: fr });
  const global = getGlobalProgress(tasks);
  const alerts = computeAlerts(tasks);

  // Header
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NGE — RAPPORT HEBDOMADAIRE D\'AVANCEMENT', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Travaux d\'augmentation de la capacité ferroviaire Kenitra–Marrakech', 14, 19);
  doc.text(`${weekStr} — Édité le ${dateStr} par ${userName}`, 14, 25);

  // Global progress box
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, 36, 182, 22, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Avancement global du marché : ${global}%`, 20, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Période : 04/05/2026 → 04/05/2027   |   ${alerts.length} retard(s) détecté(s)`, 20, 53);

  // Progress bar (manual)
  doc.setFillColor(209, 213, 219);
  doc.roundedRect(14, 61, 182, 6, 2, 2, 'F');
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(14, 61, 182 * global / 100, 6, 2, 2, 'F');

  // Ouvrage table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Avancement par ouvrage', 14, 77);

  const ouvrageRows = OUVRAGES.map((o) => {
    const prog = getOuvrageProgress(tasks, o.id);
    const alertCount = alerts.filter((a) => getOuvrageName(a.task, tasks) === o.nom.split(' - ')[0]).length;
    const status = prog === 100 ? 'Terminé' : prog > 0 ? 'En cours' : 'Non démarré';
    return [o.nom, `${prog}%`, status, alertCount > 0 ? `${alertCount} retard(s)` : '—'];
  });

  autoTable(doc, {
    startY: 80,
    head: [['Ouvrage', 'Avancement', 'Statut', 'Alertes']],
    body: ouvrageRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 8;

  // Alerts table
  if (alerts.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Tâches en retard (top 20)', 14, afterTable);

    const alertRows = alerts.slice(0, 20).map((a) => [
      a.task.nom.substring(0, 45),
      getOuvrageName(a.task, tasks),
      `${a.task.progress}%`,
      `${a.expected}%`,
      `-${a.gap}%`,
      a.gap >= 40 ? 'CRITIQUE' : a.gap >= 20 ? 'AVERT.' : 'MINEUR',
    ]);

    autoTable(doc, {
      startY: afterTable + 3,
      head: [['Tâche', 'Ouvrage', 'Réalisé', 'Prévu', 'Écart', 'Niveau']],
      body: alertRows,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 251, 251] },
      columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' } },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          const v = data.cell.raw as string;
          if (v === 'CRITIQUE') data.cell.styles.textColor = [185, 28, 28];
          if (v === 'AVERT.') data.cell.styles.textColor = [180, 83, 9];
        }
      },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Document généré automatiquement le ${dateStr} — NGE`, 14, pageHeight - 8);
  doc.text(`Page 1`, 195, pageHeight - 8, { align: 'right' });

  doc.save(`rapport-avancement-${format(today, 'yyyy-MM-dd')}.pdf`);
}
