export const ASSET_BASE = `${import.meta.env.BASE_URL}assets/track-2/`;

export const SOURCE_DOCUMENTS = [
  { id: 'immersion-2025', title: 'Ganesh & Durga immersion report', year: '2025', file: 'Ganesh_and_Durga_visarjan_report-2025.pdf' },
  { id: 'immersion-2024', title: 'Ganesh & Durga immersion report', year: '2024', file: 'Ganesh_and_Durga_visarjan_report-2024.pdf' },
  { id: 'immersion-2023', title: 'Idol immersion report', year: '2023', file: 'Idol_immer._Report_23_CPCB.pdf' },
  { id: 'monthly-lakes', title: 'Upper & Lower Lake monthly quality', year: '2025–26', file: 'Upper_Lower_Lake_monthly_2025-26_from_xgn.pdf' },
  { id: 'upper-lake', title: 'Upper Lake water quality', year: '2023–24', file: 'Bhopal-2023-24_upper_lake.pdf' },
  { id: 'lake-comparison', title: 'Upper & Lower Lake historical comparison', year: '2003–23', file: 'comparatives-uppe-lak-lower-lake-2003-2023.pdf' },
] as const;

export function reportUrl(filename: string): string {
  return `${ASSET_BASE}resources/${encodeURIComponent(filename)}`;
}
