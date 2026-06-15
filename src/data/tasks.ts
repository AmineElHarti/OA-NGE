export type Priority = 'faible' | 'moyen' | 'eleve' | 'critique';
export type KanbanStatus = 'planifie' | 'en_cours' | 'en_attente' | 'termine';

export interface Task {
  id: number;
  nom: string;
  duree: number;
  debut: string;
  fin: string;
  level: number; // 0=root, 1=phase, 2=ouvrage, 3=subtask, 4=detail
  parentId?: number;
  isMilestone?: boolean;
  progress: number; // 0-100
  notes?: string;
  updatedAt?: string;
  priority?: Priority;
  assignedTo?: string;
  blocked?: boolean; // true = "en attente" regardless of progress
}

export function getTaskStatus(t: Task): KanbanStatus {
  if (t.blocked) return 'en_attente';
  if (t.progress === 100) return 'termine';
  if (t.progress > 0) return 'en_cours';
  return 'planifie';
}

export const INITIAL_TASKS: Omit<Task, 'progress' | 'notes' | 'updatedAt'>[] = [
  { id: 1, nom: 'TRAVAUX DE CONSTRUCTION DES OA LGV', duree: 305.7, debut: '2026-05-04', fin: '2027-05-04', level: 0 },
  { id: 2, nom: 'OS DE DEMARRAGE DES TRAVAUX', duree: 0, debut: '2026-05-04', fin: '2026-05-04', level: 1, parentId: 1, isMilestone: true },
  { id: 3, nom: 'TRAVAUX PREPARATOIRES', duree: 93.1, debut: '2026-05-04', fin: '2026-08-26', level: 1, parentId: 1 },
  { id: 4, nom: 'INSTALLATION DU CHANTIER ET AMENAGEMENT DE L\'EMPRISE', duree: 35, debut: '2026-05-04', fin: '2026-06-19', level: 2, parentId: 3 },
  { id: 5, nom: 'ETUDE APD / APS DES OUVRAGES', duree: 15, debut: '2026-05-04', fin: '2026-05-19', level: 2, parentId: 3 },
  { id: 6, nom: 'ETUDE D\'EXECUTION', duree: 78.1, debut: '2026-05-19', fin: '2026-08-26', level: 2, parentId: 3 },
  { id: 7, nom: 'LES FONDATIONS DES OUVRAGES', duree: 17, debut: '2026-05-19', fin: '2026-06-17', level: 3, parentId: 6 },
  { id: 8, nom: 'LES APPUIS DES OUVRAGES', duree: 20, debut: '2026-06-17', fin: '2026-07-10', level: 3, parentId: 6 },
  { id: 9, nom: 'LES TABLIERS DES OUVRAGES', duree: 20, debut: '2026-07-10', fin: '2026-08-03', level: 3, parentId: 6 },
  { id: 10, nom: 'ETABLISSEMENT DES ETUDES D\'AMENAGEMENT', duree: 20, debut: '2026-08-03', fin: '2026-08-26', level: 3, parentId: 6 },
  { id: 11, nom: 'FABRICATION DES POUTRES PRS', duree: 91.6, debut: '2026-06-18', fin: '2026-09-29', level: 1, parentId: 1 },
  { id: 12, nom: 'FABRICATION DES POUTRES PRS OUVRAGE OULED MTAA PK78', duree: 70, debut: '2026-06-18', fin: '2026-09-05', level: 2, parentId: 11 },
  { id: 13, nom: 'FABRICATION DES POUTRES PRS OUVRAGE AV DES FAR PK82', duree: 80, debut: '2026-06-18', fin: '2026-09-16', level: 2, parentId: 11 },
  { id: 14, nom: 'FABRICATION DES POUTRES PRS OUVRAGE CARREFOUR PK97', duree: 80, debut: '2026-06-18', fin: '2026-09-16', level: 2, parentId: 11 },
  { id: 15, nom: 'FABRICATION DES POUTRES PRS OUVRAGE BOUKNADEL PK103', duree: 70, debut: '2026-07-10', fin: '2026-09-29', level: 2, parentId: 11 },
  { id: 16, nom: 'FABRICATION DES POUTRES PRS OUVRAGE BOUKNADEL PK107', duree: 70, debut: '2026-07-10', fin: '2026-09-29', level: 2, parentId: 11 },
  { id: 17, nom: 'TRAVAUX DE REALISATION DES OUVRAGES', duree: 292.2, debut: '2026-06-17', fin: '2027-05-03', level: 1, parentId: 1 },

  // PK 69
  { id: 18, nom: 'PK 69 TREMIE AIN ATIQ (DALOT DOUBLE)', duree: 224.4, debut: '2026-06-25', fin: '2027-02-27', level: 2, parentId: 17 },
  { id: 19, nom: 'TRAVAUX PREPARATOIRE DE POSE DES PONTS PROVISOIRES', duree: 20, debut: '2026-06-25', fin: '2026-07-18', level: 3, parentId: 18 },
  { id: 20, nom: 'MISE EN PLACE DU PONT PROVISOIRE', duree: 15, debut: '2026-07-18', fin: '2026-08-05', level: 3, parentId: 18 },
  { id: 21, nom: 'PHASE N°1', duree: 79, debut: '2026-07-18', fin: '2026-10-19', level: 3, parentId: 18 },
  { id: 22, nom: 'TERRASSEMENT', duree: 10, debut: '2026-07-18', fin: '2026-07-30', level: 4, parentId: 21 },
  { id: 23, nom: 'BETON PROPRETE', duree: 4, debut: '2026-07-30', fin: '2026-08-04', level: 4, parentId: 21 },
  { id: 24, nom: 'SEMELLES', duree: 20, debut: '2026-08-04', fin: '2026-08-27', level: 4, parentId: 21 },
  { id: 25, nom: 'VOILES', duree: 20, debut: '2026-08-21', fin: '2026-09-14', level: 4, parentId: 21 },
  { id: 26, nom: 'DALLE', duree: 25, debut: '2026-09-14', fin: '2026-10-13', level: 4, parentId: 21 },
  { id: 27, nom: 'MUR DE GARDE & EN AILES', duree: 30, debut: '2026-09-14', fin: '2026-10-19', level: 4, parentId: 21 },
  { id: 28, nom: 'REPOSITIONNEMENT DU PONT PROVISOIRE', duree: 10, debut: '2026-10-29', fin: '2026-11-10', level: 3, parentId: 18 },
  { id: 29, nom: 'PHASE N°2', duree: 69, debut: '2026-11-10', fin: '2027-01-29', level: 3, parentId: 18 },
  { id: 30, nom: 'TERRASSEMENT', duree: 10, debut: '2026-11-10', fin: '2026-11-21', level: 4, parentId: 29 },
  { id: 31, nom: 'BETON PROPRETE', duree: 4, debut: '2026-11-21', fin: '2026-11-26', level: 4, parentId: 29 },
  { id: 32, nom: 'SEMELLES', duree: 15, debut: '2026-11-26', fin: '2026-12-14', level: 4, parentId: 29 },
  { id: 33, nom: 'VOILES', duree: 10, debut: '2026-12-14', fin: '2026-12-25', level: 4, parentId: 29 },
  { id: 34, nom: 'DALLE', duree: 25, debut: '2026-12-25', fin: '2027-01-23', level: 4, parentId: 29 },
  { id: 35, nom: 'MUR DE GARDE & EN AILES', duree: 30, debut: '2026-12-25', fin: '2027-01-29', level: 4, parentId: 29 },
  { id: 36, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 30, debut: '2027-01-23', fin: '2027-02-27', level: 3, parentId: 18 },

  // PK 70
  { id: 37, nom: 'PK 70 TREMIE AIN ATIQ (DALOT DOUBLE)', duree: 247.5, debut: '2026-06-25', fin: '2027-03-24', level: 2, parentId: 17 },
  { id: 38, nom: 'TRAVAUX PREPARATOIRE DE POSE DES PONTS PROVISOIRES', duree: 20, debut: '2026-06-25', fin: '2026-07-18', level: 3, parentId: 37 },
  { id: 39, nom: 'MISE EN PLACE DU PONT PROVISOIRE', duree: 15, debut: '2026-07-18', fin: '2026-08-05', level: 3, parentId: 37 },
  { id: 40, nom: 'DEMOLITION OUVRAGE EXISTANT', duree: 15, debut: '2026-08-05', fin: '2026-08-22', level: 3, parentId: 37 },
  { id: 41, nom: 'PHASE N°1', duree: 75, debut: '2026-08-22', fin: '2026-11-18', level: 3, parentId: 37 },
  { id: 42, nom: 'TERRASSEMENT', duree: 15, debut: '2026-08-22', fin: '2026-09-09', level: 4, parentId: 41 },
  { id: 43, nom: 'BETON PROPRETE', duree: 5, debut: '2026-09-09', fin: '2026-09-15', level: 4, parentId: 41 },
  { id: 44, nom: 'RADIER', duree: 10, debut: '2026-09-15', fin: '2026-09-26', level: 4, parentId: 41 },
  { id: 45, nom: 'VOILES', duree: 20, debut: '2026-09-26', fin: '2026-10-20', level: 4, parentId: 41 },
  { id: 46, nom: 'MUR DE GARDE', duree: 5, debut: '2026-10-17', fin: '2026-10-23', level: 4, parentId: 41 },
  { id: 47, nom: 'DALLE', duree: 25, debut: '2026-10-20', fin: '2026-11-18', level: 4, parentId: 41 },
  { id: 48, nom: 'MUR DE GARDE & EN AILES', duree: 15, debut: '2026-10-28', fin: '2026-11-14', level: 4, parentId: 41 },
  { id: 49, nom: 'REPOSITIONNEMENT DU PONT PROVISOIRE', duree: 10, debut: '2026-11-10', fin: '2026-11-21', level: 3, parentId: 37 },
  { id: 50, nom: 'PHASE N°2', duree: 75, debut: '2026-11-21', fin: '2027-02-17', level: 3, parentId: 37 },
  { id: 51, nom: 'TERRASSEMENT', duree: 15, debut: '2026-11-21', fin: '2026-12-09', level: 4, parentId: 50 },
  { id: 52, nom: 'BETON PROPRETE', duree: 5, debut: '2026-12-09', fin: '2026-12-15', level: 4, parentId: 50 },
  { id: 53, nom: 'RADIER', duree: 10, debut: '2026-12-15', fin: '2026-12-26', level: 4, parentId: 50 },
  { id: 54, nom: 'VOILES', duree: 20, debut: '2026-12-26', fin: '2027-01-19', level: 4, parentId: 50 },
  { id: 55, nom: 'DALLE', duree: 25, debut: '2027-01-19', fin: '2027-02-17', level: 4, parentId: 50 },
  { id: 56, nom: 'MUR DE GARDE & EN AILES', duree: 15, debut: '2027-01-19', fin: '2027-02-05', level: 4, parentId: 50 },
  { id: 57, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 30, debut: '2027-02-17', fin: '2027-03-24', level: 3, parentId: 37 },

  // PK 78
  { id: 58, nom: 'PK 78 OULED MTAA', duree: 158, debut: '2026-06-17', fin: '2026-12-10', level: 2, parentId: 17 },
  { id: 59, nom: 'TERRASSEMENT', duree: 15, debut: '2026-06-17', fin: '2026-07-04', level: 3, parentId: 58 },
  { id: 60, nom: 'CULEE C0', duree: 50, debut: '2026-07-04', fin: '2026-09-01', level: 3, parentId: 58 },
  { id: 61, nom: 'SEMELLE', duree: 10, debut: '2026-07-04', fin: '2026-07-16', level: 4, parentId: 60 },
  { id: 62, nom: 'FUTS CULEES', duree: 7, debut: '2026-07-16', fin: '2026-07-24', level: 4, parentId: 60 },
  { id: 63, nom: 'REMBLAIEMENT DES FOUILLES', duree: 3, debut: '2026-07-24', fin: '2026-07-28', level: 4, parentId: 60 },
  { id: 64, nom: 'CHEVETRE', duree: 15, debut: '2026-07-28', fin: '2026-08-14', level: 4, parentId: 60 },
  { id: 65, nom: 'MISE EN PLACE DES APPAREILS D\'APPUIS', duree: 4, debut: '2026-08-14', fin: '2026-08-19', level: 4, parentId: 60 },
  { id: 66, nom: 'MUR EN RETOUR ET MUR DE GARDE', duree: 15, debut: '2026-08-14', fin: '2026-09-01', level: 4, parentId: 60 },
  { id: 67, nom: 'APPUI P01', duree: 36, debut: '2026-07-16', fin: '2026-08-27', level: 3, parentId: 58 },
  { id: 68, nom: 'SEMELLE', duree: 10, debut: '2026-07-16', fin: '2026-07-28', level: 4, parentId: 67 },
  { id: 69, nom: 'FUT', duree: 7, debut: '2026-07-28', fin: '2026-08-05', level: 4, parentId: 67 },
  { id: 70, nom: 'CHEVETRE', duree: 15, debut: '2026-08-05', fin: '2026-08-22', level: 4, parentId: 67 },
  { id: 71, nom: 'REMBLAIEMENT DES FOUILLES', duree: 3, debut: '2026-08-22', fin: '2026-08-26', level: 4, parentId: 67 },
  { id: 72, nom: 'MISE EN PLACE DES APPAREILS D\'APPUIS', duree: 4, debut: '2026-08-22', fin: '2026-08-27', level: 4, parentId: 67 },
  { id: 73, nom: 'APPUI P02', duree: 36, debut: '2026-07-28', fin: '2026-09-08', level: 3, parentId: 58 },
  { id: 74, nom: 'SEMELLE', duree: 10, debut: '2026-07-28', fin: '2026-08-08', level: 4, parentId: 73 },
  { id: 75, nom: 'FUT', duree: 7, debut: '2026-08-08', fin: '2026-08-17', level: 4, parentId: 73 },
  { id: 76, nom: 'CHEVETRE', duree: 15, debut: '2026-08-17', fin: '2026-09-03', level: 4, parentId: 73 },
  { id: 77, nom: 'REMBLAIEMENT DES FOUILLES', duree: 3, debut: '2026-09-03', fin: '2026-09-07', level: 4, parentId: 73 },
  { id: 78, nom: 'MISE EN PLACE DES APPAREILS D\'APPUIS', duree: 4, debut: '2026-09-03', fin: '2026-09-08', level: 4, parentId: 73 },
  { id: 79, nom: 'CULEE C03', duree: 52, debut: '2026-08-08', fin: '2026-10-08', level: 3, parentId: 58 },
  { id: 80, nom: 'SEMELLE', duree: 10, debut: '2026-08-08', fin: '2026-08-20', level: 4, parentId: 79 },
  { id: 81, nom: 'FUT', duree: 7, debut: '2026-08-20', fin: '2026-08-28', level: 4, parentId: 79 },
  { id: 82, nom: 'REMBLAIEMENT DES FOUILLES', duree: 5, debut: '2026-08-28', fin: '2026-09-03', level: 4, parentId: 79 },
  { id: 83, nom: 'CHEVETRE', duree: 15, debut: '2026-09-03', fin: '2026-09-21', level: 4, parentId: 79 },
  { id: 84, nom: 'MISE EN PLACE DES APPAREILS D\'APPUIS', duree: 3, debut: '2026-09-21', fin: '2026-09-24', level: 4, parentId: 79 },
  { id: 85, nom: 'MUR EN RETOUR ET MUR DE GARDE', duree: 15, debut: '2026-09-21', fin: '2026-10-08', level: 4, parentId: 79 },
  { id: 86, nom: 'REALISATION TRAVEES', duree: 24, debut: '2026-09-21', fin: '2026-10-19', level: 3, parentId: 58 },
  { id: 87, nom: 'POSE DES POUTRES', duree: 8, debut: '2026-09-21', fin: '2026-09-30', level: 4, parentId: 86 },
  { id: 88, nom: 'POSE DES PREDALLES', duree: 10, debut: '2026-09-30', fin: '2026-10-12', level: 4, parentId: 86 },
  { id: 89, nom: 'FERRAILLAGE', duree: 9, debut: '2026-10-05', fin: '2026-10-15', level: 4, parentId: 86 },
  { id: 90, nom: 'COFFRAGE & BETONNAGE TABLIER', duree: 7, debut: '2026-10-10', fin: '2026-10-19', level: 4, parentId: 86 },
  { id: 91, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 14, debut: '2026-10-22', fin: '2026-11-07', level: 3, parentId: 58 },
  { id: 92, nom: 'GARDE-CORPS ET CORNICHES', duree: 10, debut: '2026-10-22', fin: '2026-11-03', level: 4, parentId: 91 },
  { id: 93, nom: 'ETANCHEITE TABLIER (YC SECHAGE BETON)', duree: 10, debut: '2026-10-22', fin: '2026-11-03', level: 4, parentId: 91 },
  { id: 94, nom: 'JOINT CHAUSSEE', duree: 4, debut: '2026-11-03', fin: '2026-11-07', level: 4, parentId: 91 },
  { id: 95, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 30, debut: '2026-10-19', fin: '2026-11-23', level: 3, parentId: 58 },
  { id: 96, nom: 'DEMOLITION OUVRAGE EXISTANT', duree: 15, debut: '2026-11-23', fin: '2026-12-10', level: 3, parentId: 58 },

  // PK 82
  { id: 97, nom: 'PK 82 AV DES FAR', duree: 180.4, debut: '2026-08-03', fin: '2027-02-18', level: 2, parentId: 17 },
  { id: 98, nom: 'TERRASSEMENT', duree: 10, debut: '2026-08-03', fin: '2026-08-14', level: 3, parentId: 97 },
  { id: 99, nom: 'CULEE C0', duree: 59, debut: '2026-08-14', fin: '2026-10-22', level: 3, parentId: 97 },
  { id: 100, nom: 'CONFECTION DES PIEUX', duree: 20, debut: '2026-08-14', fin: '2026-09-07', level: 4, parentId: 99 },
  { id: 101, nom: 'SEMELLE', duree: 7, debut: '2026-09-07', fin: '2026-09-15', level: 4, parentId: 99 },
  { id: 102, nom: 'FUT', duree: 12, debut: '2026-09-15', fin: '2026-09-29', level: 4, parentId: 99 },
  { id: 103, nom: 'CHEVETRE', duree: 20, debut: '2026-09-29', fin: '2026-10-22', level: 4, parentId: 99 },
  { id: 104, nom: 'APPUI P01', duree: 59, debut: '2026-09-07', fin: '2026-11-14', level: 3, parentId: 97 },
  { id: 105, nom: 'CONFECTION DES PIEUX', duree: 20, debut: '2026-09-07', fin: '2026-09-30', level: 4, parentId: 104 },
  { id: 106, nom: 'SEMELLE', duree: 7, debut: '2026-09-30', fin: '2026-10-08', level: 4, parentId: 104 },
  { id: 107, nom: 'FUT', duree: 12, debut: '2026-10-08', fin: '2026-10-22', level: 4, parentId: 104 },
  { id: 108, nom: 'CHEVETRE', duree: 20, debut: '2026-10-22', fin: '2026-11-14', level: 4, parentId: 104 },
  { id: 109, nom: 'CULEE C02', duree: 59, debut: '2026-09-30', fin: '2026-12-08', level: 3, parentId: 97 },
  { id: 110, nom: 'CONFECTION DES PIEUX', duree: 20, debut: '2026-09-30', fin: '2026-10-23', level: 4, parentId: 109 },
  { id: 111, nom: 'SEMELLE', duree: 7, debut: '2026-10-23', fin: '2026-10-31', level: 4, parentId: 109 },
  { id: 112, nom: 'FUT', duree: 20, debut: '2026-10-31', fin: '2026-11-24', level: 4, parentId: 109 },
  { id: 113, nom: 'CHEVETRE', duree: 12, debut: '2026-11-24', fin: '2026-12-08', level: 4, parentId: 109 },
  { id: 114, nom: 'REALISATION TRAVEES', duree: 38, debut: '2026-12-08', fin: '2027-01-21', level: 3, parentId: 97 },
  { id: 115, nom: 'POSE DES POUTRES PREFA', duree: 3, debut: '2026-12-08', fin: '2026-12-11', level: 4, parentId: 114 },
  { id: 116, nom: 'POSE DES PREDALLES', duree: 6, debut: '2026-12-11', fin: '2026-12-18', level: 4, parentId: 114 },
  { id: 117, nom: 'FERRAILLAGE', duree: 10, debut: '2026-12-10', fin: '2026-12-22', level: 4, parentId: 114 },
  { id: 118, nom: 'COFFRAGE & BETONNAGE TABLIER', duree: 5, debut: '2026-12-22', fin: '2026-12-28', level: 4, parentId: 114 },
  { id: 119, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 19, debut: '2026-12-30', fin: '2027-01-21', level: 3, parentId: 97 },
  { id: 123, nom: 'MISE EN PLACE DE LA TERRE ARMEE & REMBLAI D\'ACCES', duree: 30, debut: '2026-12-08', fin: '2027-01-12', level: 3, parentId: 97 },
  { id: 124, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 30, debut: '2026-12-28', fin: '2027-02-01', level: 3, parentId: 97 },
  { id: 125, nom: 'DEMOLITION DE L\'OUVRAGE EXISTANT', duree: 15, debut: '2027-02-01', fin: '2027-02-18', level: 3, parentId: 97 },

  // PK 97
  { id: 126, nom: 'PK 97+300 CARREFOUR', duree: 292.2, debut: '2026-06-17', fin: '2027-05-03', level: 2, parentId: 17 },
  { id: 127, nom: 'PHASE N°1 / PLOT 1 DE RIVE GAUCHE', duree: 85, debut: '2026-06-17', fin: '2026-09-24', level: 3, parentId: 126 },
  { id: 128, nom: 'TERRASSEMENT', duree: 5, debut: '2026-06-17', fin: '2026-06-23', level: 4, parentId: 127 },
  { id: 129, nom: 'CULEE C0', duree: 32, debut: '2026-06-23', fin: '2026-07-30', level: 4, parentId: 127 },
  { id: 134, nom: 'APPUI P01', duree: 22, debut: '2026-07-10', fin: '2026-08-05', level: 4, parentId: 127 },
  { id: 138, nom: 'CULEE C02', duree: 34, debut: '2026-07-04', fin: '2026-08-13', level: 4, parentId: 127 },
  { id: 143, nom: 'REALISATION TRAVEES', duree: 15, debut: '2026-08-13', fin: '2026-08-31', level: 4, parentId: 127 },
  { id: 148, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 18, debut: '2026-08-31', fin: '2026-09-21', level: 4, parentId: 127 },
  { id: 152, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 3, debut: '2026-09-21', fin: '2026-09-24', level: 4, parentId: 127 },
  { id: 153, nom: 'PHASE N°2 / PLOT 2 DE RIVE DROITE', duree: 83, debut: '2026-09-24', fin: '2026-12-30', level: 3, parentId: 126 },
  { id: 154, nom: 'TERRASSEMENT', duree: 5, debut: '2026-09-24', fin: '2026-09-30', level: 4, parentId: 153 },
  { id: 155, nom: 'CULEE C0', duree: 32, debut: '2026-09-30', fin: '2026-11-06', level: 4, parentId: 153 },
  { id: 160, nom: 'APPUI P01', duree: 22, debut: '2026-10-17', fin: '2026-11-12', level: 4, parentId: 153 },
  { id: 164, nom: 'CULEE C02', duree: 32, debut: '2026-10-12', fin: '2026-11-18', level: 4, parentId: 153 },
  { id: 169, nom: 'REALISATION TRAVEES', duree: 15, debut: '2026-11-18', fin: '2026-12-05', level: 4, parentId: 153 },
  { id: 174, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 18, debut: '2026-12-05', fin: '2026-12-26', level: 4, parentId: 153 },
  { id: 178, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 3, debut: '2026-12-26', fin: '2026-12-30', level: 4, parentId: 153 },
  { id: 179, nom: 'DEMOLITION DE L\'OUVRAGE EXISTANT', duree: 10, debut: '2026-12-30', fin: '2027-01-11', level: 3, parentId: 126 },
  { id: 180, nom: 'PHASE N°3 / PLOT CENTRAL', duree: 96, debut: '2027-01-11', fin: '2027-05-03', level: 3, parentId: 126 },
  { id: 181, nom: 'TERRASSEMENT', duree: 5, debut: '2027-01-11', fin: '2027-01-16', level: 4, parentId: 180 },
  { id: 182, nom: 'CULEE C0', duree: 37, debut: '2027-01-16', fin: '2027-03-01', level: 4, parentId: 180 },
  { id: 187, nom: 'APPUI P01', duree: 27, debut: '2027-02-05', fin: '2027-03-09', level: 4, parentId: 180 },
  { id: 191, nom: 'CULEE C02', duree: 42, debut: '2027-01-28', fin: '2027-03-18', level: 4, parentId: 180 },
  { id: 196, nom: 'REALISATION TRAVEES', duree: 18, debut: '2027-03-18', fin: '2027-04-08', level: 4, parentId: 180 },
  { id: 201, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 18, debut: '2027-04-08', fin: '2027-04-29', level: 4, parentId: 180 },
  { id: 205, nom: 'TRAVAUX DE FINITION & EPREUVES D\'OUVRAGE', duree: 3, debut: '2027-04-29', fin: '2027-05-03', level: 4, parentId: 180 },

  // PK 98
  { id: 206, nom: 'PK 98+675 AV MY RACHID', duree: 231, debut: '2026-07-10', fin: '2027-03-22', level: 2, parentId: 17 },
  { id: 207, nom: 'TERRASSEMENT', duree: 7, debut: '2026-07-10', fin: '2026-07-17', level: 3, parentId: 206 },
  { id: 208, nom: 'CULEE C0', duree: 62, debut: '2026-07-18', fin: '2026-09-28', level: 3, parentId: 206 },
  { id: 213, nom: 'APPUI P01', duree: 62, debut: '2026-09-28', fin: '2026-12-04', level: 3, parentId: 206 },
  { id: 218, nom: 'CULEE C02', duree: 62, debut: '2026-12-04', fin: '2027-02-10', level: 3, parentId: 206 },
  { id: 223, nom: 'REALISATION TRAVEES', duree: 18, debut: '2027-02-10', fin: '2027-03-01', level: 3, parentId: 206 },
  { id: 228, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 6, debut: '2027-03-01', fin: '2027-03-06', level: 3, parentId: 206 },
  { id: 232, nom: 'TRAVAUX DE FINITION', duree: 14, debut: '2027-03-06', fin: '2027-03-22', level: 3, parentId: 206 },

  // PK 101
  { id: 235, nom: 'PK 101+285 (DALOT) MOUSTAKBAL', duree: 95.3, debut: '2026-06-17', fin: '2026-10-02', level: 2, parentId: 17 },
  { id: 236, nom: 'DEMOLITION DE L\'OUVRAGE EXISTANT', duree: 30, debut: '2026-06-17', fin: '2026-07-22', level: 3, parentId: 235 },
  { id: 237, nom: 'SOUTENEMENT & BLINDAGE', duree: 5, debut: '2026-07-22', fin: '2026-07-28', level: 3, parentId: 235 },
  { id: 238, nom: 'TERRASSEMENT', duree: 8, debut: '2026-07-28', fin: '2026-08-06', level: 3, parentId: 235 },
  { id: 239, nom: 'BETON PROPRETE', duree: 7, debut: '2026-08-06', fin: '2026-08-14', level: 3, parentId: 235 },
  { id: 240, nom: 'RADIER', duree: 10, debut: '2026-08-14', fin: '2026-08-26', level: 3, parentId: 235 },
  { id: 241, nom: 'VOILES', duree: 12, debut: '2026-08-26', fin: '2026-09-09', level: 3, parentId: 235 },
  { id: 242, nom: 'MUR DE GARDE', duree: 5, debut: '2026-09-07', fin: '2026-09-12', level: 3, parentId: 235 },
  { id: 243, nom: 'DALLE', duree: 20, debut: '2026-09-09', fin: '2026-10-02', level: 3, parentId: 235 },
  { id: 244, nom: 'MUR EN AILES', duree: 5, debut: '2026-09-17', fin: '2026-09-23', level: 3, parentId: 235 },

  // PK 103
  { id: 245, nom: 'PK 103+750 (PONT ROUTE) RP4004', duree: 147, debut: '2026-06-17', fin: '2026-11-28', level: 2, parentId: 17 },
  { id: 246, nom: 'DEMOLITION DE L\'OUVRAGE EXISTANT', duree: 30, debut: '2026-06-17', fin: '2026-07-22', level: 3, parentId: 245 },
  { id: 247, nom: 'SOUTENEMENT & BLINDAGE', duree: 5, debut: '2026-07-22', fin: '2026-07-28', level: 3, parentId: 245 },
  { id: 248, nom: 'TERRASSEMENT', duree: 7, debut: '2026-07-28', fin: '2026-08-05', level: 3, parentId: 245 },
  { id: 249, nom: 'CULEE C0', duree: 42, debut: '2026-08-05', fin: '2026-09-23', level: 3, parentId: 245 },
  { id: 253, nom: 'APPUI P01', duree: 42, debut: '2026-08-13', fin: '2026-10-01', level: 3, parentId: 245 },
  { id: 257, nom: 'CULEE C02', duree: 42, debut: '2026-08-21', fin: '2026-10-09', level: 3, parentId: 245 },
  { id: 261, nom: 'REALISATION TRAVEES', duree: 18, debut: '2026-10-09', fin: '2026-10-30', level: 3, parentId: 245 },
  { id: 266, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 11, debut: '2026-10-30', fin: '2026-11-12', level: 3, parentId: 245 },
  { id: 270, nom: 'TRAVAUX DE FINITION', duree: 14, debut: '2026-11-12', fin: '2026-11-28', level: 3, parentId: 245 },

  // PK 107
  { id: 273, nom: 'PK 107+300 (PONT ROUTE) RP4004', duree: 189.2, debut: '2026-07-10', fin: '2027-02-05', level: 2, parentId: 17 },
  { id: 274, nom: 'DEMOLITION DE L\'OUVRAGE EXISTANT', duree: 30, debut: '2026-07-10', fin: '2026-08-14', level: 3, parentId: 273 },
  { id: 275, nom: 'TERRASSEMENT', duree: 7, debut: '2026-08-14', fin: '2026-08-22', level: 3, parentId: 273 },
  { id: 276, nom: 'CULEE C0', duree: 62, debut: '2026-08-22', fin: '2026-11-03', level: 3, parentId: 273 },
  { id: 281, nom: 'APPUI P01', duree: 62, debut: '2026-09-15', fin: '2026-11-26', level: 3, parentId: 273 },
  { id: 286, nom: 'CULEE C02', duree: 62, debut: '2026-10-08', fin: '2026-12-19', level: 3, parentId: 273 },
  { id: 291, nom: 'REALISATION TRAVEES', duree: 42, debut: '2026-12-18', fin: '2027-02-05', level: 3, parentId: 273 },
  { id: 296, nom: 'TRAVAUX DE SUPER-STRUCTURE ET FINITION', duree: 11, debut: '2027-01-07', fin: '2027-01-20', level: 3, parentId: 273 },
  { id: 300, nom: 'TRAVAUX DE FINITION', duree: 14, debut: '2027-01-20', fin: '2027-02-05', level: 3, parentId: 273 },

  // PK 110
  { id: 303, nom: 'PK 110+540 (DALOT) OULAD SBITA', duree: 57.9, debut: '2026-06-17', fin: '2026-08-22', level: 2, parentId: 17 },
  { id: 304, nom: 'TERRASSEMENT', duree: 8, debut: '2026-06-17', fin: '2026-06-26', level: 3, parentId: 303 },
  { id: 305, nom: 'BETON PROPRETE', duree: 7, debut: '2026-06-26', fin: '2026-07-04', level: 3, parentId: 303 },
  { id: 306, nom: 'RADIER', duree: 10, debut: '2026-07-04', fin: '2026-07-16', level: 3, parentId: 303 },
  { id: 307, nom: 'VOILES', duree: 12, debut: '2026-07-16', fin: '2026-07-30', level: 3, parentId: 303 },
  { id: 308, nom: 'MUR DE GARDE', duree: 5, debut: '2026-07-28', fin: '2026-08-03', level: 3, parentId: 303 },
  { id: 309, nom: 'DALLE', duree: 20, debut: '2026-07-30', fin: '2026-08-22', level: 3, parentId: 303 },
  { id: 310, nom: 'MUR EN AILES', duree: 5, debut: '2026-08-07', fin: '2026-08-13', level: 3, parentId: 303 },

  // PK 111
  { id: 311, nom: 'PK 111+000 (DALOT) OULAD SBITA', duree: 66, debut: '2026-07-10', fin: '2026-09-24', level: 2, parentId: 17 },
  { id: 312, nom: 'SOUTENEMENT & BLINDAGE', duree: 5, debut: '2026-07-10', fin: '2026-07-16', level: 3, parentId: 311 },
  { id: 313, nom: 'MISE EN PLACE DU PONT PROVISOIRE', duree: 3, debut: '2026-07-16', fin: '2026-07-20', level: 3, parentId: 311 },
  { id: 314, nom: 'TERRASSEMENT', duree: 8, debut: '2026-07-20', fin: '2026-07-29', level: 3, parentId: 311 },
  { id: 315, nom: 'BETON PROPRETE', duree: 7, debut: '2026-07-29', fin: '2026-08-06', level: 3, parentId: 311 },
  { id: 316, nom: 'RADIER', duree: 10, debut: '2026-08-06', fin: '2026-08-18', level: 3, parentId: 311 },
  { id: 317, nom: 'VOILES', duree: 12, debut: '2026-08-18', fin: '2026-09-01', level: 3, parentId: 311 },
  { id: 318, nom: 'MUR DE GARDE', duree: 5, debut: '2026-08-29', fin: '2026-09-04', level: 3, parentId: 311 },
  { id: 319, nom: 'DALLE', duree: 20, debut: '2026-09-01', fin: '2026-09-24', level: 3, parentId: 311 },
  { id: 320, nom: 'MUR EN AILES', duree: 5, debut: '2026-09-09', fin: '2026-09-15', level: 3, parentId: 311 },

  // PK 159
  { id: 321, nom: 'PK 159 (SAUT DE MOUTON)', duree: 100.1, debut: '2026-07-10', fin: '2026-10-30', level: 2, parentId: 17 },
  { id: 322, nom: 'SOUTENEMENT & BLINDAGE', duree: 5, debut: '2026-07-10', fin: '2026-07-16', level: 3, parentId: 321 },
  { id: 323, nom: 'TERRASSEMENT', duree: 5, debut: '2026-07-16', fin: '2026-07-22', level: 3, parentId: 321 },
  { id: 324, nom: 'BETON PROPRETE', duree: 6, debut: '2026-07-22', fin: '2026-07-29', level: 3, parentId: 321 },
  { id: 325, nom: 'SEMELLES', duree: 20, debut: '2026-07-29', fin: '2026-08-21', level: 3, parentId: 321 },
  { id: 326, nom: 'VOILES', duree: 30, debut: '2026-08-21', fin: '2026-09-25', level: 3, parentId: 321 },
  { id: 327, nom: 'MUR DE GARDE', duree: 15, debut: '2026-09-23', fin: '2026-10-10', level: 3, parentId: 321 },
  { id: 328, nom: 'DALLE', duree: 30, debut: '2026-09-25', fin: '2026-10-30', level: 3, parentId: 321 },
  { id: 329, nom: 'MUR EN AILES', duree: 5, debut: '2026-10-03', fin: '2026-10-09', level: 3, parentId: 321 },

  // PK 160
  { id: 330, nom: 'PK 160 (PONT ROUTE)', duree: 94.6, debut: '2026-07-10', fin: '2026-10-24', level: 2, parentId: 17 },

  { id: 355, nom: 'ACHEVEMENT DES TRAVAUX', duree: 1, debut: '2027-05-03', fin: '2027-05-04', level: 1, parentId: 1, isMilestone: true },
];

export const OUVRAGES = [
  { id: 18, nom: 'PK 69 - Trémie Ain Atiq (Dalot Double)', color: '#3b82f6' },
  { id: 37, nom: 'PK 70 - Trémie Ain Atiq (Dalot Double)', color: '#8b5cf6' },
  { id: 58, nom: 'PK 78 - Ouled Mtaa', color: '#10b981' },
  { id: 97, nom: 'PK 82 - Av des FAR', color: '#f59e0b' },
  { id: 126, nom: 'PK 97+300 - Carrefour', color: '#ef4444' },
  { id: 206, nom: 'PK 98+675 - Av My Rachid', color: '#ec4899' },
  { id: 235, nom: 'PK 101+285 - Dalot Moustakbal', color: '#06b6d4' },
  { id: 245, nom: 'PK 103+750 - Pont Route RP4004', color: '#84cc16' },
  { id: 273, nom: 'PK 107+300 - Pont Route RP4004', color: '#f97316' },
  { id: 303, nom: 'PK 110+540 - Dalot Oulad Sbita', color: '#6366f1' },
  { id: 311, nom: 'PK 111+000 - Dalot Oulad Sbita', color: '#14b8a6' },
  { id: 321, nom: 'PK 159 - Saut de Mouton', color: '#a855f7' },
  { id: 330, nom: 'PK 160 - Pont Route', color: '#d97706' },
];
