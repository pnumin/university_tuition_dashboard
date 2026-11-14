import type { DisciplineKey, Filters, TuitionRecord } from './types';

export const disciplineLabels: Record<DisciplineKey, string> = {
  humanities: '인문사회',
  naturalScience: '자연과학',
  artsSports: '예체능',
  engineering: '공학',
  medicine: '의학',
};

export function formatManwon(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return '자료 없음';
  return `${(value / 10_000).toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}만원`;
}

export function formatWon(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '자료 없음';
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '비교 불가';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function filterRecords(records: TuitionRecord[], filters: Filters): TuitionRecord[] {
  const keyword = filters.search.trim().toLocaleLowerCase('ko-KR');
  const min = filters.minTuition ? Number(filters.minTuition) * 10_000 : null;
  const max = filters.maxTuition ? Number(filters.maxTuition) * 10_000 : null;

  return records.filter((record) => {
    if (!record.available2026 || record.tuition2026 === null) return false;
    if (keyword && !record.schoolName.toLocaleLowerCase('ko-KR').includes(keyword)) return false;
    if (filters.region && record.region !== filters.region) return false;
    if (filters.establishment && record.establishmentType !== filters.establishment) return false;
    if (filters.changeStatus && record.changeStatus !== filters.changeStatus) return false;
    if (min !== null && record.tuition2026 < min) return false;
    if (max !== null && record.tuition2026 > max) return false;
    return true;
  });
}

export function downloadCsv(records: TuitionRecord[]): void {
  const headers = [
    '대학·캠퍼스', '지역', '설립구분', '2025 등록금', '2026 등록금',
    '증감액', '증감률(%)', '변동상태'
  ];
  const rows = records.map((record) => [
    record.schoolName,
    record.region,
    record.establishmentType,
    record.tuition2025 ?? '',
    record.tuition2026 ?? '',
    record.changeAmount ?? '',
    record.changeRate?.toFixed(4) ?? '',
    record.changeStatus,
  ]);

  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'university-tuition-filtered.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function statusLabel(status: TuitionRecord['changeStatus']): string {
  return {
    increase: '인상',
    same: '동일',
    decrease: '인하',
    'not-comparable': '비교 불가',
  }[status];
}
