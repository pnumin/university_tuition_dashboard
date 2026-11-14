import { useEffect, useMemo, useState } from 'react';
import type {
  DisciplineKey,
  Filters,
  TuitionData,
  TuitionRecord,
  ViewName,
} from './types';
import {
  average,
  disciplineLabels,
  downloadCsv,
  filterRecords,
  formatManwon,
  formatRate,
  formatWon,
  statusLabel,
} from './utils';

const initialFilters: Filters = {
  search: '',
  region: '',
  establishment: '',
  changeStatus: '',
  minTuition: '',
  maxTuition: '',
};

const navItems: Array<{ key: ViewName; label: string }> = [
  { key: 'overview', label: '한눈에 보기' },
  { key: 'universities', label: '대학 찾아보기' },
  { key: 'compare', label: '대학 비교' },
  { key: 'analysis', label: '지역·계열 분석' },
  { key: 'methodology', label: '데이터 안내' },
];

function KpiCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: 'default' | 'up' | 'down';
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span className="kpi-label">{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </article>
  );
}

function HorizontalBars({
  items,
  valueFormatter = (value) => formatManwon(value),
}: {
  items: Array<{ label: string; value: number; subLabel?: string; color?: string }>;
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="horizontal-bars">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-heading">
            <span>{item.label}</span>
            <strong>{valueFormatter(item.value)}</strong>
          </div>
          <div
            className="bar-track"
            role="img"
            aria-label={`${item.label} ${valueFormatter(item.value)}`}
          >
            <span
              className="bar-fill"
              style={{
                width: `${Math.max((item.value / max) * 100, 2)}%`,
                background: item.color,
              }}
            />
          </div>
          {item.subLabel && <small>{item.subLabel}</small>}
        </div>
      ))}
    </div>
  );
}

function GroupedBars({
  items,
}: {
  items: Array<{ label: string; value2025: number; value2026: number; count?: number }>;
}) {
  const max = Math.max(...items.flatMap((item) => [item.value2025, item.value2026]), 1);
  return (
    <div className="grouped-bars">
      {items.map((item) => (
        <div className="group-row" key={item.label}>
          <div className="group-label">
            <strong>{item.label}</strong>
            {item.count !== undefined && <small>n={item.count}</small>}
          </div>
          <div className="group-values">
            <div>
              <span>2025</span>
              <div className="bar-track">
                <i className="bar-fill year-2025" style={{ width: `${(item.value2025 / max) * 100}%` }} />
              </div>
              <b>{formatManwon(item.value2025)}</b>
            </div>
            <div>
              <span>2026</span>
              <div className="bar-track">
                <i className="bar-fill year-2026" style={{ width: `${(item.value2026 / max) * 100}%` }} />
              </div>
              <b>{formatManwon(item.value2026)}</b>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  regions,
  establishments,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  regions: string[];
  establishments: string[];
}) {
  const update = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <section className="filters-panel" aria-label="대학 필터">
      <div className="filter-search">
        <label htmlFor="school-search">대학·캠퍼스 검색</label>
        <input
          id="school-search"
          type="search"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          placeholder="예: 가천대학교, 제2캠퍼스"
        />
      </div>
      <div>
        <label htmlFor="region-filter">지역</label>
        <select id="region-filter" value={filters.region} onChange={(event) => update('region', event.target.value)}>
          <option value="">전체 지역</option>
          {regions.map((region) => <option key={region}>{region}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="establishment-filter">설립구분</label>
        <select
          id="establishment-filter"
          value={filters.establishment}
          onChange={(event) => update('establishment', event.target.value)}
        >
          <option value="">전체 설립구분</option>
          {establishments.map((type) => <option key={type}>{type}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="change-filter">전년 대비</label>
        <select
          id="change-filter"
          value={filters.changeStatus}
          onChange={(event) => update('changeStatus', event.target.value)}
        >
          <option value="">전체 변동</option>
          <option value="increase">인상</option>
          <option value="same">동일</option>
          <option value="decrease">인하</option>
          <option value="not-comparable">비교 불가</option>
        </select>
      </div>
      <div className="range-fields">
        <label>등록금 범위(만원)</label>
        <div>
          <input
            inputMode="numeric"
            value={filters.minTuition}
            onChange={(event) => update('minTuition', event.target.value.replace(/\D/g, ''))}
            placeholder="최소"
            aria-label="최소 등록금 만원"
          />
          <span>~</span>
          <input
            inputMode="numeric"
            value={filters.maxTuition}
            onChange={(event) => update('maxTuition', event.target.value.replace(/\D/g, ''))}
            placeholder="최대"
            aria-label="최대 등록금 만원"
          />
        </div>
      </div>
      <button className="button secondary reset-button" onClick={() => setFilters(initialFilters)}>
        전체 초기화
      </button>
    </section>
  );
}

function OverviewPage({ records }: { records: TuitionRecord[] }) {
  const comparable = records.filter((record) => record.tuition2025 !== null && record.tuition2026 !== null);
  const avg25 = average(comparable.map((record) => record.tuition2025));
  const avg26 = average(comparable.map((record) => record.tuition2026));
  const change = avg25 !== null && avg26 !== null ? avg26 - avg25 : null;
  const rate = avg25 && change !== null ? (change / avg25) * 100 : null;
  const counts = {
    increase: comparable.filter((record) => record.changeStatus === 'increase').length,
    same: comparable.filter((record) => record.changeStatus === 'same').length,
    decrease: comparable.filter((record) => record.changeStatus === 'decrease').length,
  };
  const increaseShare = comparable.length ? (counts.increase / comparable.length) * 100 : 0;

  const bands = [
    { label: '400만원 미만', min: 0, max: 4_000_000 },
    { label: '400~600만원', min: 4_000_000, max: 6_000_000 },
    { label: '600~800만원', min: 6_000_000, max: 8_000_000 },
    { label: '800~1,000만원', min: 8_000_000, max: 10_000_000 },
    { label: '1,000만원 이상', min: 10_000_000, max: Infinity },
  ].map((band) => ({
    label: band.label,
    value: records.filter(
      (record) => record.tuition2026 !== null &&
        record.tuition2026 >= band.min &&
        record.tuition2026 < band.max,
    ).length,
  }));

  const establishmentItems = Array.from(new Set(records.map((record) => record.establishmentType)))
    .map((type) => ({
      label: type,
      value: average(records.filter((record) => record.establishmentType === type).map((record) => record.tuition2026)) ?? 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">2025 → 2026 일반대학교 등록금</span>
          <h1>내가 지원할 대학의 등록금,<br />쉽게 비교해 보세요.</h1>
          <p>
            본교와 분교·캠퍼스를 각각 구분하고, 전년 대비 인상액과 계열별 등록금을 학생 관점에서 보여줍니다.
          </p>
        </div>
        <div className="hero-stat">
          <span>필터 적용 대학·캠퍼스</span>
          <strong>{records.length}개</strong>
          <small>등록금 0원 제외</small>
        </div>
      </section>

      <section className="kpi-grid" aria-label="핵심 지표">
        <KpiCard label="2025 평균" value={formatManwon(avg25, 2)} helper={`동일 ${comparable.length}개 기준`} />
        <KpiCard label="2026 평균" value={formatManwon(avg26, 2)} helper="대학·캠퍼스 단순평균" />
        <KpiCard label="연간 평균 증가액" value={formatManwon(change, 2)} helper={`학기당 단순 ${formatManwon(change === null ? null : change / 2, 2)}`} tone="up" />
        <KpiCard label="평균 증가율" value={formatRate(rate)} helper="동일 기관 평균 비교" tone="up" />
        <KpiCard label="등록금 인상 비율" value={`${increaseShare.toFixed(1)}%`} helper={`${counts.increase}개 인상`} tone="up" />
        <KpiCard label="비교 불가" value={`${records.length - comparable.length}개`} helper="전년도 동일 명칭 자료 없음" />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">YEARLY COMPARISON</span>
              <h2>평균 등록금 변화</h2>
            </div>
          </div>
          {avg25 !== null && avg26 !== null && (
            <GroupedBars items={[{ label: '필터 적용 평균', value2025: avg25, value2026: avg26, count: comparable.length }]} />
          )}
          <p className="insight">
            {change !== null && change >= 0
              ? `전년보다 연간 평균 ${formatManwon(change, 2)} 올랐습니다.`
              : `전년보다 연간 평균 ${formatManwon(change === null ? null : Math.abs(change), 2)} 낮아졌습니다.`}
          </p>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">CHANGE STATUS</span>
              <h2>인상·동일·인하 현황</h2>
            </div>
          </div>
          <div className="status-summary">
            <div className="status-card increase"><strong>{counts.increase}</strong><span>인상</span></div>
            <div className="status-card same"><strong>{counts.same}</strong><span>동일</span></div>
            <div className="status-card decrease"><strong>{counts.decrease}</strong><span>인하</span></div>
          </div>
          <div className="stacked-bar" aria-label="등록금 변동 비율">
            <span className="increase" style={{ width: `${comparable.length ? counts.increase / comparable.length * 100 : 0}%` }} />
            <span className="same" style={{ width: `${comparable.length ? counts.same / comparable.length * 100 : 0}%` }} />
            <span className="decrease" style={{ width: `${comparable.length ? counts.decrease / comparable.length * 100 : 0}%` }} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">TUITION RANGE</span>
              <h2>2026 등록금 구간</h2>
            </div>
          </div>
          <HorizontalBars
            items={bands.map((item) => ({ ...item, subLabel: `${records.length ? (item.value / records.length * 100).toFixed(1) : 0}%` }))}
            valueFormatter={(value) => `${value}개`}
          />
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">ESTABLISHMENT</span>
              <h2>설립구분별 2026 평균</h2>
            </div>
          </div>
          <HorizontalBars items={establishmentItems} />
        </article>
      </section>

      <aside className="student-tip">
        <strong>학생을 위한 확인 포인트</strong>
        <p>
          대학 전체 평균보다 지원하려는 캠퍼스와 희망 계열의 실제 등록금을 확인하세요.
          기숙사비·주거비·교재비와 장학금을 함께 계산해야 실제 교육비를 비교할 수 있습니다.
        </p>
      </aside>
    </>
  );
}

function UniversityDetail({
  record,
  onClose,
  onCompare,
  selected,
  nationalAverage,
}: {
  record: TuitionRecord;
  onClose: () => void;
  onCompare: () => void;
  selected: boolean;
  nationalAverage: number | null;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const difference = record.tuition2026 !== null && nationalAverage !== null
    ? record.tuition2026 - nationalAverage
    : null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="상세 창 닫기">×</button>
        <span className="eyebrow">{record.region} · {record.establishmentType}</span>
        <h2 id="detail-title">{record.schoolName}</h2>
        <div className="detail-kpis">
          <KpiCard label="2026 연간 등록금" value={formatManwon(record.tuition2026, 2)} />
          <KpiCard label="학기당 단순 환산" value={formatManwon(record.semesterEstimate2026, 2)} />
          <KpiCard label="전년 대비" value={formatManwon(record.changeAmount, 2)} helper={formatRate(record.changeRate)} tone={record.changeAmount !== null && record.changeAmount < 0 ? 'down' : 'up'} />
        </div>
        <p className="detail-insight">
          {difference === null
            ? '전국 평균과 비교할 수 없습니다.'
            : difference >= 0
              ? `필터 적용 평균보다 ${formatManwon(difference, 2)} 높습니다.`
              : `필터 적용 평균보다 ${formatManwon(Math.abs(difference), 2)} 낮습니다.`}
        </p>
        <h3>계열별 2026 등록금</h3>
        <HorizontalBars
          items={(Object.keys(disciplineLabels) as DisciplineKey[])
            .filter((key) => record.disciplines2026[key] !== null)
            .map((key) => ({
              label: disciplineLabels[key],
              value: record.disciplines2026[key] ?? 0,
            }))}
        />
        <p className="empty-note">
          0원 계열은 미개설 또는 비해당 가능성이 있어 표시하지 않습니다.
        </p>
        <button className="button primary" onClick={onCompare}>
          {selected ? '비교 목록에서 제거' : '비교 목록에 추가'}
        </button>
      </section>
    </div>
  );
}

function UniversitiesPage({
  records,
  selectedIds,
  toggleCompare,
  openDetail,
}: {
  records: TuitionRecord[];
  selectedIds: string[];
  toggleCompare: (record: TuitionRecord) => void;
  openDetail: (record: TuitionRecord) => void;
}) {
  const [sort, setSort] = useState('tuition-desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => setPage(1), [records, sort]);

  const sorted = useMemo(() => {
    const result = [...records];
    switch (sort) {
      case 'name': return result.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'ko'));
      case 'tuition-asc': return result.sort((a, b) => (a.tuition2026 ?? 0) - (b.tuition2026 ?? 0));
      case 'rate-desc': return result.sort((a, b) => (b.changeRate ?? -Infinity) - (a.changeRate ?? -Infinity));
      case 'rate-asc': return result.sort((a, b) => (a.changeRate ?? Infinity) - (b.changeRate ?? Infinity));
      default: return result.sort((a, b) => (b.tuition2026 ?? 0) - (a.tuition2026 ?? 0));
    }
  }, [records, sort]);

  const totalPages = Math.max(Math.ceil(sorted.length / pageSize), 1);
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">UNIVERSITY EXPLORER</span>
          <h1>대학 찾아보기</h1>
          <p>검색 조건에 맞는 {records.length}개 대학·캠퍼스입니다.</p>
        </div>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="대학 정렬">
          <option value="tuition-desc">등록금 높은 순</option>
          <option value="tuition-asc">등록금 낮은 순</option>
          <option value="rate-desc">인상률 높은 순</option>
          <option value="rate-asc">인상률 낮은 순</option>
          <option value="name">대학명순</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>비교</th>
              <th>대학·캠퍼스</th>
              <th>지역</th>
              <th>설립</th>
              <th>2025</th>
              <th>2026</th>
              <th>증감액</th>
              <th>증감률</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((record) => (
              <tr key={record.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => toggleCompare(record)}
                    aria-label={`${record.schoolName} 비교 선택`}
                  />
                </td>
                <td>
                  <button className="school-link" onClick={() => openDetail(record)}>
                    {record.schoolName}
                  </button>
                </td>
                <td>{record.region}</td>
                <td>{record.establishmentType}</td>
                <td>{formatManwon(record.tuition2025)}</td>
                <td><strong>{formatManwon(record.tuition2026)}</strong></td>
                <td className={record.changeAmount !== null && record.changeAmount < 0 ? 'text-down' : 'text-up'}>
                  {formatManwon(record.changeAmount)}
                </td>
                <td>{formatRate(record.changeRate)}</td>
                <td><span className={`status-badge ${record.changeStatus}`}>{statusLabel(record.changeStatus)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <div className="empty-state">선택한 조건에 해당하는 대학이 없습니다.</div>}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>이전</button>
        <span>{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>다음</button>
      </div>
    </section>
  );
}

function ComparePage({
  records,
  remove,
  goToUniversities,
}: {
  records: TuitionRecord[];
  remove: (record: TuitionRecord) => void;
  goToUniversities: () => void;
}) {
  if (records.length < 2) {
    return (
      <section className="empty-large">
        <span className="empty-icon">⇄</span>
        <h1>비교할 대학을 2개 이상 선택해 주세요.</h1>
        <p>최대 5개 대학·캠퍼스의 등록금과 계열별 금액을 비교할 수 있습니다.</p>
        <button className="button primary" onClick={goToUniversities}>대학 찾아보기</button>
      </section>
    );
  }

  const chartItems = records.map((record) => ({
    label: record.schoolName,
    value2025: record.tuition2025 ?? 0,
    value2026: record.tuition2026 ?? 0,
  }));

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMPARE</span>
          <h1>대학 비교</h1>
          <p>{records.length}개 대학·캠퍼스를 같은 기준으로 비교합니다.</p>
        </div>
      </div>
      <article className="panel">
        <h2>연간 등록금 비교</h2>
        <GroupedBars items={chartItems} />
      </article>
      <div className="comparison-grid">
        {records.map((record) => (
          <article className="comparison-card" key={record.id}>
            <button onClick={() => remove(record)} aria-label={`${record.schoolName} 비교에서 제거`}>×</button>
            <span>{record.region} · {record.establishmentType}</span>
            <h2>{record.schoolName}</h2>
            <dl>
              <div><dt>2026 등록금</dt><dd>{formatManwon(record.tuition2026, 2)}</dd></div>
              <div><dt>학기당 단순 환산</dt><dd>{formatManwon(record.semesterEstimate2026, 2)}</dd></div>
              <div><dt>증감액</dt><dd>{formatManwon(record.changeAmount, 2)}</dd></div>
              <div><dt>증감률</dt><dd>{formatRate(record.changeRate)}</dd></div>
            </dl>
            <h3>계열별 등록금</h3>
            <ul>
              {(Object.keys(disciplineLabels) as DisciplineKey[]).map((key) => (
                <li key={key}>
                  <span>{disciplineLabels[key]}</span>
                  <strong>{formatManwon(record.disciplines2026[key])}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function AnalysisPage({ records }: { records: TuitionRecord[] }) {
  const comparable = records.filter((record) => record.tuition2025 !== null && record.tuition2026 !== null);
  const regions = Array.from(new Set(records.map((record) => record.region)))
    .map((region) => {
      const target = records.filter((record) => record.region === region);
      return {
        label: region,
        value: average(target.map((record) => record.tuition2026)) ?? 0,
        subLabel: `n=${target.length}`,
      };
    })
    .sort((a, b) => b.value - a.value);

  const disciplineItems = (Object.keys(disciplineLabels) as DisciplineKey[]).map((key) => {
    const valid = comparable.filter(
      (record) => record.disciplines2025[key] !== null && record.disciplines2026[key] !== null,
    );
    return {
      label: disciplineLabels[key],
      value2025: average(valid.map((record) => record.disciplines2025[key])) ?? 0,
      value2026: average(valid.map((record) => record.disciplines2026[key])) ?? 0,
      count: valid.length,
    };
  });

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REGION & DISCIPLINE</span>
          <h1>지역·계열 분석</h1>
          <p>지역 평균은 대학 구성의 영향을 받으므로 표본 수와 함께 확인하세요.</p>
        </div>
      </div>
      <div className="analysis-grid">
        <article className="panel">
          <h2>지역별 2026 평균</h2>
          <HorizontalBars items={regions} />
        </article>
        <article className="panel">
          <h2>계열별 전년 비교</h2>
          <GroupedBars items={disciplineItems} />
          <p className="empty-note">양 연도 모두 해당 계열 금액이 있는 동일 기관만 비교했습니다.</p>
        </article>
      </div>
    </section>
  );
}

function MethodologyPage({ data }: { data: TuitionData }) {
  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">METHODOLOGY</span>
          <h1>데이터 안내</h1>
          <p>대시보드의 수치를 올바르게 해석하기 위한 기준입니다.</p>
        </div>
      </div>
      <div className="method-grid">
        <article className="panel">
          <h2>분석 기준</h2>
          <ul className="check-list">
            <li>학교종류가 ‘대학교’인 데이터만 사용</li>
            <li>사이버대학·교육대학·산업대학 등 제외</li>
            <li>본교·분교·제2캠퍼스를 각각 독립 단위로 처리</li>
            <li>전체 등록금이 0원인 행 제외</li>
            <li>계열별 0원은 미개설 또는 비해당으로 보고 제외</li>
            <li>학교·캠퍼스 명칭이 동일한 경우에만 전년 비교</li>
          </ul>
        </article>
        <article className="panel">
          <h2>데이터 규모</h2>
          <dl className="data-counts">
            <div><dt>2025년</dt><dd>{data.metadata.counts.year2025}개</dd></div>
            <div><dt>2026년</dt><dd>{data.metadata.counts.year2026}개</dd></div>
            <div><dt>동일 기관 비교</dt><dd>{data.metadata.counts.common}개</dd></div>
            <div><dt>2025년에만 존재</dt><dd>{data.metadata.counts.only2025}개</dd></div>
            <div><dt>2026년에만 존재</dt><dd>{data.metadata.counts.only2026}개</dd></div>
          </dl>
        </article>
        <article className="panel">
          <h2>주의할 점</h2>
          <ul className="check-list warning">
            <li>학생 수를 반영한 가중평균이 아닌 대학·캠퍼스별 단순평균입니다.</li>
            <li>등록금은 장학금과 감면을 적용하기 전 금액입니다.</li>
            <li>학기당 금액은 연간 등록금을 2로 나눈 참고값입니다.</li>
            <li>실제 고지액은 학과·학년·수강학점에 따라 달라질 수 있습니다.</li>
            <li>등록금만으로 교육의 질이나 대학의 가성비를 평가할 수 없습니다.</li>
          </ul>
        </article>
        <article className="panel">
          <h2>계산식</h2>
          <div className="formula">
            <strong>증감액</strong>
            <code>2026년 등록금 − 2025년 등록금</code>
          </div>
          <div className="formula">
            <strong>증감률</strong>
            <code>증감액 ÷ 2025년 등록금 × 100</code>
          </div>
          <div className="formula">
            <strong>학기당 단순 환산</strong>
            <code>연간 등록금 ÷ 2</code>
          </div>
        </article>
      </div>
    </section>
  );
}

export default function App() {
  const [data, setData] = useState<TuitionData | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewName>(() => {
    const param = new URLSearchParams(window.location.search).get('view') as ViewName | null;
    return navItems.some((item) => item.key === param) ? param! : 'overview';
  });
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<TuitionRecord | null>(null);

  useEffect(() => {
    fetch('/data/tuition-data.json')
      .then((response) => {
        if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.');
        return response.json();
      })
      .then((payload: TuitionData) => setData(payload))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState({}, '', url);
  }, [view]);

  const currentRecords = useMemo(
    () => data?.records.filter((record) => record.available2026) ?? [],
    [data],
  );
  const filteredRecords = useMemo(
    () => filterRecords(currentRecords, filters),
    [currentRecords, filters],
  );
  const regions = useMemo(
    () => Array.from(new Set(currentRecords.map((record) => record.region))).sort((a, b) => a.localeCompare(b, 'ko')),
    [currentRecords],
  );
  const establishments = useMemo(
    () => Array.from(new Set(currentRecords.map((record) => record.establishmentType))).sort((a, b) => a.localeCompare(b, 'ko')),
    [currentRecords],
  );
  const selectedRecords = useMemo(
    () => selectedIds.map((id) => currentRecords.find((record) => record.id === id)).filter((record): record is TuitionRecord => Boolean(record)),
    [selectedIds, currentRecords],
  );
  const nationalAverage = average(filteredRecords.map((record) => record.tuition2026));

  const toggleCompare = (record: TuitionRecord) => {
    setSelectedIds((current) => {
      if (current.includes(record.id)) return current.filter((id) => id !== record.id);
      if (current.length >= 5) {
        window.alert('비교는 최대 5개 대학·캠퍼스까지 가능합니다.');
        return current;
      }
      return [...current, record.id];
    });
  };

  if (error) {
    return <main className="loading"><h1>오류가 발생했습니다.</h1><p>{error}</p></main>;
  }
  if (!data) {
    return <main className="loading"><div className="loader" /><p>등록금 데이터를 불러오는 중입니다.</p></main>;
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => setView('overview')}>
          <span className="brand-mark">₩</span>
          <span><strong>대학 등록금</strong><small>한눈에</small></span>
        </button>
        <nav aria-label="주요 메뉴">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={view === item.key ? 'active' : ''}
              onClick={() => setView(item.key)}
            >
              {item.label}
              {item.key === 'compare' && selectedIds.length > 0 && <b>{selectedIds.length}</b>}
            </button>
          ))}
        </nav>
      </header>

      {view !== 'methodology' && (
        <div className="filter-container">
          <FiltersPanel
            filters={filters}
            setFilters={setFilters}
            regions={regions}
            establishments={establishments}
          />
          <div className="filter-actions">
            <span>{filteredRecords.length}개 결과</span>
            <button className="button secondary" onClick={() => downloadCsv(filteredRecords)}>CSV 다운로드</button>
          </div>
        </div>
      )}

      <main className="content">
        {view === 'overview' && <OverviewPage records={filteredRecords} />}
        {view === 'universities' && (
          <UniversitiesPage
            records={filteredRecords}
            selectedIds={selectedIds}
            toggleCompare={toggleCompare}
            openDetail={setDetail}
          />
        )}
        {view === 'compare' && (
          <ComparePage
            records={selectedRecords}
            remove={toggleCompare}
            goToUniversities={() => setView('universities')}
          />
        )}
        {view === 'analysis' && <AnalysisPage records={filteredRecords} />}
        {view === 'methodology' && <MethodologyPage data={data} />}
      </main>

      {selectedIds.length > 0 && view !== 'compare' && (
        <div className="compare-tray">
          <span><strong>{selectedIds.length}개</strong> 대학 선택됨</span>
          <button onClick={() => setView('compare')}>비교하기</button>
        </div>
      )}

      {detail && (
        <UniversityDetail
          record={detail}
          onClose={() => setDetail(null)}
          onCompare={() => toggleCompare(detail)}
          selected={selectedIds.includes(detail.id)}
          nationalAverage={nationalAverage}
        />
      )}

      <footer>
        <p>2025·2026 일반대학교 등록금 데이터 기반 · 등록금 0원 제외 · 캠퍼스 독립 분석</p>
        <button onClick={() => setView('methodology')}>분석 기준 보기</button>
      </footer>
    </div>
  );
}
