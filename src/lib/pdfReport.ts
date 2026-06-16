import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Task } from '../data/tasks';
import { OUVRAGES } from '../data/tasks';
import type { Contrainte, Etude, ContrainteOption, OuvragePhoto } from '../store/useOuvrageStore';
import { computeAlerts } from './scurve';
import { computeProgress, computeTheoreticalProgress, getDescendants, isLeaf } from '../hooks/useOuvrageProgress';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Shared helpers ────────────────────────────────────────────────────────

const BRAND = { primary: [30, 64, 175] as [number, number, number], dark: [15, 23, 42] as [number, number, number] };
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;

function drawHeader(doc: jsPDF, title: string, subtitle: string, meta: string) {
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, PAGE_W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, MARGIN, 20);
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 255);
  doc.text(meta, MARGIN, 26);

  // NGE logo box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PAGE_W - MARGIN - 24, 8, 24, 16, 2, 2, 'F');
  doc.setTextColor(...BRAND.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NGE', PAGE_W - MARGIN - 12, 17, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('OA LGV', PAGE_W - MARGIN - 12, 20.5, { align: 'center' });
}

function drawFooter(doc: jsPDF, page: number, total: number, generatedBy: string) {
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const date = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  doc.text(`Généré le ${date} par ${generatedBy}`, MARGIN, PAGE_H - 8);
  doc.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  doc.setDrawColor(220);
  doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
}

function drawProgressBar(doc: jsPDF, x: number, y: number, width: number, height: number, percent: number, color: [number, number, number]) {
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
  doc.setFillColor(...color);
  const w = Math.max(0, Math.min(100, percent)) / 100 * width;
  if (w > 0) doc.roundedRect(x, y, w, height, height / 2, height / 2, 'F');
}

function drawStatBox(doc: jsPDF, x: number, y: number, width: number, label: string, value: string, valueColor: [number, number, number] = [15, 23, 42], sub?: string) {
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(x, y, width, 18, 2, 2, 'FD');
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), x + 3, y + 5);
  doc.setTextColor(...valueColor);
  doc.setFontSize(13);
  doc.text(value, x + 3, y + 12);
  if (sub) {
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(sub, x + 3, y + 16);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return [100, 100, 100];
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

function ouvrageOf(task: Task, tasks: Task[]) {
  let cur: Task | undefined = task;
  while (cur) {
    const o = OUVRAGES.find((ow) => ow.id === cur!.id);
    if (o) return o;
    cur = tasks.find((t) => t.id === cur!.parentId);
  }
  return null;
}

// ─── 1. Weekly Report ──────────────────────────────────────────────────────

export function generateWeeklyReport(
  tasks: Task[],
  contraintes: Contrainte[],
  etudes: Etude[],
  concessionnaires: ContrainteOption[],
  userName: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const today = new Date();
  const weekStr = format(today, "'Semaine' w · yyyy", { locale: fr });
  const dateStr = format(today, "EEEE dd MMMM yyyy", { locale: fr });
  const totalPages = 2;

  drawHeader(
    doc,
    'Rapport hebdomadaire d\'avancement',
    'NGE — Augmentation de la capacité ferroviaire Kenitra–Marrakech',
    `${weekStr} · ${dateStr}`
  );

  // ── Hero stats ──────────────────────────────────────────────────────
  const allLeaves = tasks.filter((t) => isLeaf(t.id, tasks));
  const globalProgress = computeProgress(tasks);
  const theoretical = computeTheoreticalProgress(tasks);
  const gap = globalProgress - theoretical;
  const alerts = computeAlerts(tasks);
  const root = tasks.find((t) => t.level === 0);
  const daysRemaining = root ? Math.max(0, differenceInDays(parseISO(root.fin), today)) : 0;
  const openEtudes = etudes.filter((e) => e.status !== 'valide').length;
  const blockedTasks = allLeaves.filter((t) => t.blocked).length;

  let y = 40;

  // 4 stat boxes row
  const boxW = (PAGE_W - 2 * MARGIN - 9) / 4;
  drawStatBox(doc, MARGIN, y, boxW, 'Avancement', `${globalProgress}%`, BRAND.primary, `Prévu : ${theoretical}%`);
  drawStatBox(doc, MARGIN + (boxW + 3), y, boxW, 'Écart', `${gap >= 0 ? '+' : ''}${gap}%`, gap >= 0 ? [16, 185, 129] : [239, 68, 68], gap >= 0 ? 'En avance' : 'En retard');
  drawStatBox(doc, MARGIN + 2 * (boxW + 3), y, boxW, 'Jours restants', `${daysRemaining}j`, [15, 23, 42], root ? `Fin ${format(parseISO(root.fin), 'dd/MM/yy', { locale: fr })}` : '');
  drawStatBox(doc, MARGIN + 3 * (boxW + 3), y, boxW, 'Alertes', `${alerts.length}`, alerts.length > 0 ? [239, 68, 68] : [16, 185, 129], `${alerts.filter((a) => a.gap >= 40).length} critiques`);

  y += 24;

  // Global progress bar
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text('Avancement global du marché', MARGIN, y);
  doc.text(`${globalProgress}%`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 2;
  drawProgressBar(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 5, globalProgress, BRAND.primary);
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.setFontSize(7);
  doc.text(`Prévu : ${theoretical}%`, MARGIN, y + 3);
  drawProgressBar(doc, MARGIN, y + 4, PAGE_W - 2 * MARGIN, 2, theoretical, [156, 163, 175]);
  y += 14;

  // ── Per-ouvrage table ───────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text('Synthèse par ouvrage', MARGIN, y);
  y += 3;

  const ouvrageRows = OUVRAGES.map((o) => {
    const desc = getDescendants(tasks, o.id);
    const prog = computeProgress(desc);
    const theo = computeTheoreticalProgress(desc);
    const eC = gap;
    return {
      nom: o.nom,
      prog,
      theo,
      gap: prog - theo,
      color: hexToRgb(o.color),
      eC,
    };
  });

  autoTable(doc, {
    startY: y,
    head: [['Ouvrage', 'Réalisé', 'Prévu', 'Écart', 'État']],
    body: ouvrageRows.map((o) => [
      o.nom,
      `${o.prog}%`,
      `${o.theo}%`,
      `${o.gap >= 0 ? '+' : ''}${o.gap}%`,
      o.prog === 100 ? 'Terminé' : o.prog === 0 ? 'Non démarré' : o.gap < -20 ? 'En retard' : o.gap < 0 ? 'À risque' : 'OK',
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 24 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const o = ouvrageRows[data.row.index];
      if (data.column.index === 3) {
        data.cell.styles.textColor = o.gap >= 0 ? [16, 185, 129] : [239, 68, 68];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 4) {
        const s = data.cell.raw as string;
        if (s === 'En retard') data.cell.styles.textColor = [239, 68, 68];
        else if (s === 'À risque') data.cell.styles.textColor = [217, 119, 6];
        else if (s === 'Terminé') data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });

  drawFooter(doc, 1, totalPages, userName);

  // ── PAGE 2 ─────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, 'Alertes et points d\'attention', 'Détail des retards, contraintes et études', `${weekStr}`);

  y = 40;

  // Alerts table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text(`Tâches en retard — Top ${Math.min(15, alerts.length)}`, MARGIN, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`(${alerts.length} retard${alerts.length > 1 ? 's' : ''} détecté${alerts.length > 1 ? 's' : ''} au total)`, MARGIN + 70, y);
  y += 3;

  if (alerts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Tâche', 'Ouvrage', 'Réalisé', 'Prévu', 'Écart']],
      body: alerts.slice(0, 15).map((a) => [
        a.task.nom.substring(0, 50),
        ouvrageOf(a.task, tasks)?.nom.split(' - ')[0] ?? '—',
        `${a.task.progress}%`,
        `${a.expected}%`,
        `-${a.gap}%`,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 251, 251] },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center', textColor: [185, 28, 28], fontStyle: 'bold' } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Aucun retard détecté', MARGIN, y + 8);
    y += 16;
  }

  // Contraintes summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text('Contraintes par concessionnaire', MARGIN, y);
  y += 3;

  const byConc = new Map<string, { id: number; en_cours: number; levee: number }>();
  contraintes.forEach((c) => {
    const cur = byConc.get(c.typeReseau) ?? { id: 0, en_cours: 0, levee: 0 };
    if (c.status === 'identifiee') cur.id++;
    else if (c.status === 'en_cours_levee') cur.en_cours++;
    else cur.levee++;
    byConc.set(c.typeReseau, cur);
  });

  if (byConc.size > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Concessionnaire', 'Identifiées', 'En cours', 'Levées', 'Total']],
      body: Array.from(byConc.entries()).map(([k, v]) => [
        concessionnaires.find((c) => c.value === k)?.label ?? k,
        v.id,
        v.en_cours,
        v.levee,
        v.id + v.en_cours + v.levee,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Aucune contrainte enregistrée', MARGIN, y + 8);
    y += 16;
  }

  // Études summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text(`Études : ${openEtudes} non validées · ${blockedTasks} tâches bloquées`, MARGIN, y);

  drawFooter(doc, 2, totalPages, userName);

  doc.save(`rapport-hebdo-${format(today, 'yyyy-MM-dd')}.pdf`);
}

// ─── 2. Ouvrage Report ─────────────────────────────────────────────────────

export function generateOuvrageReport(
  tasks: Task[],
  ouvrageId: number,
  contraintes: Contrainte[],
  etudes: Etude[],
  userName: string,
  photos: OuvragePhoto[] = [],
) {
  const ouvrage = OUVRAGES.find((o) => o.id === ouvrageId);
  if (!ouvrage) return;

  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const today = new Date();
  const dateStr = format(today, "EEEE dd MMMM yyyy", { locale: fr });
  const color = hexToRgb(ouvrage.color);

  const desc = getDescendants(tasks, ouvrageId);
  const leaves = desc.filter((t) => isLeaf(t.id, desc));
  const progress = computeProgress(desc);
  const theoretical = computeTheoreticalProgress(desc);
  const gap = progress - theoretical;
  const alerts = computeAlerts(desc);
  const root = desc.find((t) => t.id === ouvrageId);
  const daysRemaining = root ? Math.max(0, differenceInDays(parseISO(root.fin), today)) : 0;

  const ouvrContraintes = contraintes.filter((c) => c.ouvrageId === ouvrageId);
  const ouvrEtudes = etudes.filter((e) => e.ouvrageId === ouvrageId);
  const ouvrPhotos = photos.filter((p) => p.ouvrageId === ouvrageId);
  const hasPhotos = ouvrPhotos.length > 0;
  const totalPages = hasPhotos ? 3 : 2;

  drawHeader(
    doc,
    `Fiche ouvrage — ${ouvrage.nom.split(' - ')[0]}`,
    ouvrage.nom.split(' - ').slice(1).join(' - '),
    dateStr
  );

  let y = 38;

  // Colored band
  doc.setFillColor(...color);
  doc.rect(MARGIN, y, 4, 16, 'F');
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(`${progress}%`, MARGIN + 8, y + 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('avancement réalisé', MARGIN + 8, y + 16);
  y += 22;

  // Stats row
  const boxW = (PAGE_W - 2 * MARGIN - 9) / 4;
  drawStatBox(doc, MARGIN, y, boxW, 'Prévu', `${theoretical}%`, [100, 100, 100]);
  drawStatBox(doc, MARGIN + (boxW + 3), y, boxW, 'Écart', `${gap >= 0 ? '+' : ''}${gap}%`, gap >= 0 ? [16, 185, 129] : [239, 68, 68]);
  drawStatBox(doc, MARGIN + 2 * (boxW + 3), y, boxW, 'Jours restants', `${daysRemaining}j`);
  drawStatBox(doc, MARGIN + 3 * (boxW + 3), y, boxW, 'Tâches', `${leaves.filter((t) => t.progress === 100).length}/${leaves.length}`);
  y += 24;

  // Progress bars
  drawProgressBar(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 5, progress, color);
  y += 6;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Prévu théorique`, MARGIN, y + 3);
  doc.text(`${theoretical}%`, PAGE_W - MARGIN, y + 3, { align: 'right' });
  drawProgressBar(doc, MARGIN, y + 4, PAGE_W - 2 * MARGIN, 2, theoretical, [156, 163, 175]);
  y += 14;

  // Tasks table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text(`Détail des tâches (${leaves.length})`, MARGIN, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Tâche', 'Début', 'Fin', 'Durée', 'Réalisé', 'État']],
    body: leaves.map((t) => [
      t.nom.substring(0, 50),
      format(parseISO(t.debut), 'dd/MM/yy', { locale: fr }),
      format(parseISO(t.fin), 'dd/MM/yy', { locale: fr }),
      `${t.duree}j`,
      `${t.progress}%`,
      t.blocked ? 'Bloquée' : t.progress === 100 ? 'Terminée' : t.progress === 0 ? 'À démarrer' : 'En cours',
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: color, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const s = data.cell.raw as string;
        if (s === 'Bloquée') data.cell.styles.textColor = [217, 119, 6];
        else if (s === 'Terminée') data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });

  drawFooter(doc, 1, totalPages, userName);

  // ── PAGE 2 ─────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, `Études et contraintes — ${ouvrage.nom.split(' - ')[0]}`, ouvrage.nom.split(' - ').slice(1).join(' - '), dateStr);
  y = 38;

  // Études
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text(`Études (${ouvrEtudes.length})`, MARGIN, y);
  y += 3;

  if (ouvrEtudes.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Document', 'Ind.', 'Statut', 'Soumis', 'Validé']],
      body: ouvrEtudes.map((e) => [
        e.type,
        e.nom.substring(0, 40),
        e.version,
        e.status,
        e.dateSoumission ? format(parseISO(e.dateSoumission), 'dd/MM/yy', { locale: fr }) : '—',
        e.dateValidation ? format(parseISO(e.dateValidation), 'dd/MM/yy', { locale: fr }) : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 245, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Aucune étude enregistrée', MARGIN, y + 8);
    y += 16;
  }

  // Contraintes
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text(`Contraintes (${ouvrContraintes.length})`, MARGIN, y);
  y += 3;

  if (ouvrContraintes.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Concessionnaire', 'Description', 'PK', 'Statut', 'Identifiée']],
      body: ouvrContraintes.map((c) => [
        c.typeReseau,
        c.description.substring(0, 45),
        c.pkLocalisation ?? '—',
        c.status,
        c.dateIdentification ? format(parseISO(c.dateIdentification), 'dd/MM/yy', { locale: fr }) : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 251, 235] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Aucune contrainte enregistrée', MARGIN, y + 8);
    y += 16;
  }

  // Alerts on this ouvrage
  if (alerts.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.dark);
    doc.text(`Retards (${alerts.length})`, MARGIN, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Tâche', 'Réalisé', 'Prévu', 'Écart']],
      body: alerts.map((a) => [a.task.nom.substring(0, 60), `${a.task.progress}%`, `${a.expected}%`, `-${a.gap}%`]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', textColor: [185, 28, 28], fontStyle: 'bold' } },
    });
  }

  drawFooter(doc, 2, totalPages, userName);

  // ── PAGE 3 — Photos ───────────────────────────────────────────────
  if (hasPhotos) {
    doc.addPage();
    drawHeader(doc, `Plans et conception — ${ouvrage.nom.split(' - ')[0]}`, ouvrage.nom.split(' - ').slice(1).join(' - '), dateStr);
    y = 38;

    const conceptionPhotos = ouvrPhotos.filter((p) => p.categorie === 'conception');
    const planPhotos = ouvrPhotos.filter((p) => p.categorie === 'vue_en_plan');
    const maxImgW = PAGE_W - 2 * MARGIN;

    for (const { label, items } of [
      { label: 'Conception de l\'ouvrage', items: conceptionPhotos },
      { label: 'Vue en plan', items: planPhotos },
    ]) {
      if (items.length === 0) continue;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.dark);
      doc.text(label, MARGIN, y);
      y += 5;

      for (const photo of items) {
        try {
          const imgProps = doc.getImageProperties(photo.dataUrl);
          const ratio = imgProps.width / imgProps.height;
          let imgW = Math.min(maxImgW, 120);
          let imgH = imgW / ratio;
          if (imgH > 100) { imgH = 100; imgW = imgH * ratio; }

          if (y + imgH + 10 > PAGE_H - 20) {
            drawFooter(doc, doc.getNumberOfPages(), totalPages, userName);
            doc.addPage();
            y = 20;
          }

          doc.addImage(photo.dataUrl, 'JPEG', MARGIN, y, imgW, imgH);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120);
          doc.text(photo.nom, MARGIN, y + imgH + 4);
          y += imgH + 10;
        } catch {
          // skip corrupt images
        }
      }
      y += 4;
    }

    drawFooter(doc, 3, totalPages, userName);
  }

  doc.save(`fiche-${ouvrage.nom.split(' - ')[0].toLowerCase().replace(/\s+/g, '-')}-${format(today, 'yyyy-MM-dd')}.pdf`);
}

// ─── 3. Coordination Report ────────────────────────────────────────────────

export function generateCoordinationReport(
  contraintes: Contrainte[],
  etudes: Etude[],
  concessionnaires: ContrainteOption[],
  typesEtude: ContrainteOption[],
  userName: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const today = new Date();
  const dateStr = format(today, "EEEE dd MMMM yyyy", { locale: fr });

  drawHeader(doc, 'État de coordination', 'Contraintes concessionnaires & Études BET', dateStr);

  let y = 40;

  // Contraintes par concessionnaire (full detail)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text('Contraintes par concessionnaire', MARGIN, y);
  y += 3;

  const grouped = new Map<string, Contrainte[]>();
  contraintes.forEach((c) => {
    if (!grouped.has(c.typeReseau)) grouped.set(c.typeReseau, []);
    grouped.get(c.typeReseau)!.push(c);
  });

  if (grouped.size > 0) {
    const rows: any[] = [];
    Array.from(grouped.entries()).forEach(([conc, items]) => {
      const label = concessionnaires.find((c) => c.value === conc)?.label ?? conc;
      items.forEach((c) => {
        const ouv = OUVRAGES.find((o) => o.id === c.ouvrageId);
        rows.push([
          label,
          ouv?.nom.split(' - ')[0] ?? '—',
          c.description.substring(0, 40),
          c.pkLocalisation ?? '—',
          c.status,
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      head: [['Concessionnaire', 'Ouvrage', 'Description', 'PK', 'Statut']],
      body: rows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [217, 119, 6], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 251, 235] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Aucune contrainte enregistrée', MARGIN, y + 8);
    y += 16;
  }

  // Études par type
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text('Études par type', MARGIN, y);
  y += 3;

  const groupedE = new Map<string, Etude[]>();
  etudes.forEach((e) => {
    if (!groupedE.has(e.type)) groupedE.set(e.type, []);
    groupedE.get(e.type)!.push(e);
  });

  if (groupedE.size > 0) {
    const rows: any[] = [];
    Array.from(groupedE.entries()).forEach(([type, items]) => {
      const label = typesEtude.find((t) => t.value === type)?.label ?? type;
      items.forEach((e) => {
        const ouv = OUVRAGES.find((o) => o.id === e.ouvrageId);
        rows.push([
          label,
          ouv?.nom.split(' - ')[0] ?? '—',
          e.nom.substring(0, 35),
          e.version,
          e.status,
          e.dateSoumission ? format(parseISO(e.dateSoumission), 'dd/MM/yy', { locale: fr }) : '—',
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      head: [['Type', 'Ouvrage', 'Document', 'Ind.', 'Statut', 'Soumis']],
      body: rows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 245, 255] },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Aucune étude enregistrée', MARGIN, y + 8);
  }

  drawFooter(doc, 1, 1, userName);
  doc.save(`coordination-${format(today, 'yyyy-MM-dd')}.pdf`);
}

// ─── 4. CSV Export ─────────────────────────────────────────────────────────

export function exportTasksCSV(tasks: Task[]) {
  const leaves = tasks.filter((t) => isLeaf(t.id, tasks));
  const header = ['ID', 'Ouvrage', 'Tâche', 'Début', 'Fin', 'Durée (j)', 'Avancement (%)', 'Bloquée', 'Priorité', 'Assigné'];
  const rows = leaves.map((t) => {
    const ouv = ouvrageOf(t, tasks);
    return [
      t.id,
      ouv?.nom.split(' - ')[0] ?? '—',
      `"${t.nom.replace(/"/g, '""')}"`,
      t.debut,
      t.fin,
      t.duree,
      t.progress,
      t.blocked ? 'Oui' : 'Non',
      t.priority ?? '',
      t.assignedTo ?? '',
    ].join(';');
  });
  const csv = [header.join(';'), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taches-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Legacy alias for backward compatibility ──────────────────────────────

export function generatePDFReport(tasks: Task[], userName: string) {
  generateWeeklyReport(tasks, [], [], [], userName);
}
