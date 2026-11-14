export type ChangeStatus = 'increase' | 'same' | 'decrease' | 'not-comparable';
export type ViewName = 'overview' | 'universities' | 'compare' | 'analysis' | 'methodology';
export type DisciplineKey = 'humanities' | 'naturalScience' | 'artsSports' | 'engineering' | 'medicine';

export interface DisciplineValues {
  humanities: number | null;
  naturalScience: number | null;
  artsSports: number | null;
  engineering: number | null;
  medicine: number | null;
}

export interface TuitionRecord {
  id: string;
  schoolName: string;
  region: string;
  establishmentType: string;
  status: string;
  available2025: boolean;
  available2026: boolean;
  tuition2025: number | null;
  tuition2026: number | null;
  semesterEstimate2026: number | null;
  changeAmount: number | null;
  changeRate: number | null;
  changeStatus: ChangeStatus;
  disciplines2025: DisciplineValues;
  disciplines2026: DisciplineValues;
}

export interface Metadata {
  serviceName: string;
  years: number[];
  latestYear: number;
  updatedAt: string;
  unit: string;
  scope: string;
  zeroTuitionExcluded: boolean;
  campusIndependent: boolean;
  counts: {
    year2025: number;
    year2026: number;
    common: number;
    only2025: number;
    only2026: number;
  };
}

export interface TuitionData {
  metadata: Metadata;
  records: TuitionRecord[];
}

export interface Filters {
  search: string;
  region: string;
  establishment: string;
  changeStatus: string;
  minTuition: string;
  maxTuition: string;
}
