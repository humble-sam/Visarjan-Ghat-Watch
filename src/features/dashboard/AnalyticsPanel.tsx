import type { ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Activity, AlertOctagon, Droplets, FlaskConical, Gauge } from 'lucide-react';
import { PHASE_LABELS } from '../../shared/defaults';
import type { Analysis } from '../../shared/types';
import {
  BAR_COLOR, breachHeatmap, doBodPairs, headline, heatColor, HEAT_RAMP, phaseImpact, siteBreachBars,
  STATUS_COLORS, yearlyBreachShare, type ScatterGroup,
} from './analytics';
import { formatNumber, shortParameter } from './model';
import './analytics.css';

// Member 4 area. Charts read the shared Analysis only; see analytics.ts.

const AXIS = { fontSize: 13, fill: '#52605f' };
const TOOLTIP_STYLE = { fontSize: 14, borderColor: '#ccd5d5', borderRadius: 8 };
const GROUP_LABEL: Record<ScatterGroup, string> = {
  both_meet: 'DO and BOD meet Class B',
  one_breach: 'One of DO / BOD breaches',
  both_breach: 'Both DO and BOD breach',
};
const GROUP_STYLE: Record<ScatterGroup, { color: string; shape: 'circle' | 'triangle' | 'diamond' }> = {
  both_meet: { color: STATUS_COLORS.meets, shape: 'circle' },
  one_breach: { color: STATUS_COLORS.serious, shape: 'triangle' },
  both_breach: { color: STATUS_COLORS.breaches, shape: 'diamond' },
};

function Hatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#eef1f1" />
        <line x1="0" y1="0" x2="0" y2="6" stroke={STATUS_COLORS.noData} strokeWidth="3" />
      </pattern>
    </defs>
  );
}

function ChartCard({ title, subtitle, icon, children, table, wide }: {
  title: string; subtitle: string; icon: ReactNode; children: ReactNode; table: ReactNode; wide?: boolean;
}) {
  return (
    <figure className={`chart-card${wide ? ' wide' : ''}`}>
      <figcaption>
        <span className="chart-icon" aria-hidden="true">{icon}</span>
        <span><strong>{title}</strong><small>{subtitle}</small></span>
      </figcaption>
      {children}
      <details className="chart-table"><summary>View as table</summary>{table}</details>
    </figure>
  );
}

export function AnalyticsPanel({ analysis, onSelectSite }: { analysis: Analysis; onSelectSite: (siteId: string) => void }) {
  const stats = headline(analysis);
  const bars = siteBreachBars(analysis);
  const heat = breachHeatmap(analysis);
  const phases = phaseImpact(analysis);
  const pairs = doBodPairs(analysis);
  const years = yearlyBreachShare(analysis);
  const assessedBars = bars.filter((bar) => bar.percent !== null);
  // Shared top for the scatter y-axis and its "worst corner" shading (low DO, high BOD).
  const bodTop = Math.max(6, Math.ceil(Math.max(0, ...pairs.map((point) => point.bod)) / 3) * 3);
  const share = stats.numeric ? Math.round((stats.breaches / stats.numeric) * 100) : null;

  if (!stats.readings) {
    return <section className="analytics" aria-label="Analytics"><p className="chart-empty">No benchmark readings in this scope, so there is nothing to chart. This is not a clean result: fresh testing is needed.</p></section>;
  }

  return (
    <section className="analytics" aria-labelledby="analytics-title">
      <div className="subsection-heading"><h3 id="analytics-title">Analytics for the selected period</h3>
        <span>Every chart uses the same readings as the ranking</span></div>

      <div className="stat-tiles">
        <div className="stat-tile"><Gauge aria-hidden="true" /><span>Readings breaching Class B</span>
          <strong>{share === null ? '—' : `${share}%`}</strong><small>{stats.breaches} of {stats.numeric} numeric DO/BOD/pH</small></div>
        <div className="stat-tile critical"><Droplets aria-hidden="true" /><span>Lowest dissolved oxygen</span>
          <strong>{stats.lowestDo ? `${formatNumber(stats.lowestDo.value)} mg/l` : '—'}</strong>
          <small>{stats.lowestDo ? stats.lowestDo.site : 'No numeric DO'} · limit ≥ 5</small></div>
        <div className="stat-tile warning"><FlaskConical aria-hidden="true" /><span>Highest BOD</span>
          <strong>{stats.highestBod ? `${formatNumber(stats.highestBod.value)} mg/l` : '—'}</strong>
          <small>{stats.highestBod ? stats.highestBod.site : 'No numeric BOD'} · limit ≤ 3</small></div>
        <div className="stat-tile neutral"><Activity aria-hidden="true" /><span>Slots without a number</span>
          <strong>{stats.readings - stats.numeric}</strong><small>BDL, not sampled or unknown · absent tables are extra</small></div>
      </div>

      <div className="chart-grid-2">
        <ChartCard title="Breach share by ghat" subtitle="Share of numeric DO/BOD/pH readings outside Class B. Click a bar to open the ghat."
          icon={<AlertOctagon size={18} />}
          table={<table className="evidence-table"><thead><tr><th>Ghat</th><th>Rank</th><th>Breaches</th><th>Share</th></tr></thead>
            <tbody>{bars.map((bar) => <tr key={bar.siteId}><th scope="row">{bar.name}</th><td>{bar.rank ?? '—'}</td>
              <td>{bar.breaches}/{bar.numeric}</td><td>{bar.percent === null ? 'No numeric' : `${bar.percent}%`}</td></tr>)}</tbody></table>}>
          <div role="img" aria-label={`Breach share by ghat: ${bars.map((bar) => `${bar.name} ${bar.percent === null ? 'no numeric readings' : `${bar.percent}% (${bar.breaches} of ${bar.numeric})`}`).join('; ')}.`}>
            <ResponsiveContainer width="100%" height={Math.max(220, bars.length * 40)}>
              <BarChart data={bars.map((bar) => ({ ...bar, value: bar.percent ?? 0 }))} layout="vertical" margin={{ top: 4, right: 70, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} stroke="#e7ecec" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={AXIS} tickLine={false} axisLine={{ stroke: '#ccd5d5' }} />
                <YAxis type="category" dataKey="label" width={120} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f5' }} contentStyle={TOOLTIP_STYLE}
                  formatter={(_value, _name, entry) => {
                    const bar = entry.payload as (typeof bars)[number];
                    return [bar.percent === null ? 'No numeric readings' : `${bar.percent}% (${bar.breaches} of ${bar.numeric})`, bar.name];
                  }} labelFormatter={() => ''} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} cursor="pointer"
                  onClick={(entry) => onSelectSite((entry as unknown as { siteId: string }).siteId)}>
                  {bars.map((bar) => <Cell key={bar.siteId} fill={bar.percent === null ? STATUS_COLORS.noData : BAR_COLOR} />)}
                  <LabelList dataKey="percent" position="right" style={{ fontSize: 13, fill: '#263334' }}
                    formatter={(value) => value === null || value === undefined ? 'No data' : `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {assessedBars.length < bars.length && <p className="chart-note">Gray “No data” means no numeric benchmark reading: testing needed, not clean.</p>}
        </ChartCard>

        <ChartCard title="Where breaches happen" subtitle="Breaches out of numeric readings, per ghat and parameter. Darker = larger share."
          icon={<FlaskConical size={18} />}
          table={<table className="evidence-table"><thead><tr><th>Ghat</th>{heat[0]?.cells.map((cell) => <th key={cell.parameter}>{shortParameter(cell.parameter)}</th>)}</tr></thead>
            <tbody>{heat.map((row) => <tr key={row.siteId}><th scope="row">{row.label}</th>
              {row.cells.map((cell) => <td key={cell.parameter}>{cell.numeric ? `${cell.breaches}/${cell.numeric}` : 'No numeric'}</td>)}</tr>)}</tbody></table>}>
          <div className="heatmap" role="table" aria-label="Breaches by ghat and parameter">
            <div className="heat-row heat-head" role="row"><span role="columnheader">Ghat</span>
              {heat[0]?.cells.map((cell) => <span key={cell.parameter} role="columnheader">{shortParameter(cell.parameter)}</span>)}</div>
            {heat.map((row) => (
              <div className="heat-row" role="row" key={row.siteId}>
                <button type="button" role="rowheader" className="heat-site" onClick={() => onSelectSite(row.siteId)}>{row.label}</button>
                {row.cells.map((cell) => {
                  const dark = cell.share !== null && HEAT_RAMP.indexOf(heatColor(cell.share)) >= 4;
                  return (
                    <span key={cell.parameter} role="cell" className={`heat-cell${cell.share === null ? ' empty' : ''}${dark ? ' dark' : ''}`}
                      style={{ background: cell.share === null ? undefined : heatColor(cell.share) }}
                      title={`${row.label} · ${shortParameter(cell.parameter)}: ${cell.numeric ? `${cell.breaches} of ${cell.numeric} breach` : 'no numeric reading'}`}>
                      {cell.numeric ? <><strong>{cell.breaches}/{cell.numeric}</strong><small>{Math.round((cell.share ?? 0) * 100)}%</small></> : <small>No data</small>}
                    </span>
                  );
                })}
              </div>
            ))}
            <div className="heat-legend" aria-hidden="true"><span>0%</span>
              {HEAT_RAMP.map((color) => <i key={color} style={{ background: color }} />)}<span>100%</span>
              <i className="empty" /><span>No numeric</span></div>
          </div>
        </ChartCard>

        <ChartCard title="Before, during and after immersion" subtitle="All benchmark readings across ghats, by immersion phase. The number in brackets is the total for that phase."
          icon={<Activity size={18} />}
          table={<table className="evidence-table"><thead><tr><th>Phase</th><th>Meets</th><th>Breaches</th><th>No number</th></tr></thead>
            <tbody>{phases.map((row) => <tr key={row.phase}><th scope="row">{PHASE_LABELS[row.phase]}</th><td>{row.meets}</td><td>{row.breaches}</td><td>{row.noNumeric}</td></tr>)}</tbody></table>}>
          <div role="img" aria-label={`Readings by phase: ${phases.map((row) => `${PHASE_LABELS[row.phase]} ${row.breaches} breach, ${row.meets} meet, ${row.noNumeric} without a number`).join('; ')}.`}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={phases.map((row) => ({ ...row, label: `${PHASE_LABELS[row.phase]} (${row.total})` }))} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
                <Hatch id="hatch-phase" />
                <CartesianGrid vertical={false} stroke="#e7ecec" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#ccd5d5' }} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f5' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="breaches" name="Breaches" stackId="phase" fill={STATUS_COLORS.breaches} stroke="#fff" strokeWidth={2} />
                <Bar dataKey="meets" name="Meets" stackId="phase" fill={STATUS_COLORS.meets} stroke="#fff" strokeWidth={2} />
                <Bar dataKey="noNumeric" name="No number" stackId="phase" fill="url(#hatch-phase)" stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[['Breaches', STATUS_COLORS.breaches], ['Meets', STATUS_COLORS.meets], ['No number (BDL / not sampled)', 'hatch']]} />
        </ChartCard>

        <ChartCard title="Oxygen vs organic load" subtitle="Each point is one ghat sample with both DO and BOD. Top-left is the worst corner."
          icon={<Droplets size={18} />}
          table={<table className="evidence-table"><thead><tr><th>Ghat</th><th>Period</th><th>DO</th><th>BOD</th></tr></thead>
            <tbody>{pairs.map((point) => <tr key={point.key}><th scope="row">{point.site}</th><td>{point.period}</td><td>{point.do}</td><td>{point.bod}</td></tr>)}</tbody></table>}>
          {pairs.length === 0 ? <p className="chart-empty">No sample has both a numeric DO and BOD in this scope.</p> : (
            <div role="img" aria-label={`Scatter of ${pairs.length} samples: ${(['both_breach', 'one_breach', 'both_meet'] as const).map((group) => `${pairs.filter((point) => point.group === group).length} ${GROUP_LABEL[group].toLowerCase()}`).join(', ')}.`}>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 26, right: 58, bottom: 22, left: -6 }}>
                  <CartesianGrid stroke="#e7ecec" />
                  <ReferenceArea x1={0} x2={5} y1={3} y2={bodTop} fill={STATUS_COLORS.breaches} fillOpacity={0.06} />
                  <XAxis type="number" dataKey="do" name="DO" unit=" mg/l" tick={AXIS} tickLine={false} domain={[0, 'auto']}
                    label={{ value: 'Dissolved oxygen (mg/l) →  higher is better', position: 'insideBottom', offset: -12, fontSize: 13, fill: '#52605f' }} />
                  <YAxis type="number" dataKey="bod" name="BOD" unit=" mg/l" tick={AXIS} tickLine={false} domain={[0, bodTop]} width={58} />
                  <ZAxis range={[90, 90]} />
                  <ReferenceLine x={5} stroke="#52605f" strokeDasharray="4 4" label={{ value: 'DO 5', position: 'top', fontSize: 13, fill: '#52605f' }} />
                  <ReferenceLine y={3} stroke="#52605f" strokeDasharray="4 4" label={{ value: 'BOD 3', position: 'right', fontSize: 13, fill: '#52605f' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={TOOLTIP_STYLE}
                    content={({ payload }) => {
                      const point = payload?.[0]?.payload as (typeof pairs)[number] | undefined;
                      if (!point) return null;
                      return <div className="chart-tooltip"><strong>{point.site}</strong><span>{point.period}</span>
                        <span>DO {point.do} mg/l · BOD {point.bod} mg/l</span><span>{GROUP_LABEL[point.group]}</span></div>;
                    }} />
                  {(Object.keys(GROUP_STYLE) as ScatterGroup[]).map((group) => (
                    <Scatter key={group} name={GROUP_LABEL[group]} data={pairs.filter((point) => point.group === group)}
                      fill={GROUP_STYLE[group].color} shape={GROUP_STYLE[group].shape} stroke="#fff" strokeWidth={1.5}
                      cursor="pointer" onClick={(point) => onSelectSite((point as unknown as { siteId: string }).siteId)} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
          <Legend items={(Object.keys(GROUP_STYLE) as ScatterGroup[]).map((group) => [GROUP_LABEL[group], GROUP_STYLE[group].color, GROUP_STYLE[group].shape])} />
        </ChartCard>

        {years.length > 0 && (
          <ChartCard wide title="Year over year" subtitle="Breach share for the same festivals and phases in each selected year. Sample sizes differ by year."
            icon={<Gauge size={18} />}
            table={<table className="evidence-table"><thead><tr><th>Year</th><th>Breaches</th><th>Share</th></tr></thead>
              <tbody>{years.map((row) => <tr key={row.year}><th scope="row">{row.year}</th><td>{row.breaches}/{row.numeric}</td><td>{row.percent === null ? 'No numeric' : `${row.percent}%`}</td></tr>)}</tbody></table>}>
            <div role="img" aria-label={`Breach share by year: ${years.map((row) => `${row.year} ${row.percent === null ? 'no numeric' : `${row.percent}% of ${row.numeric}`}`).join('; ')}.`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={years.map((row) => ({ ...row, label: String(row.year), value: row.percent ?? 0 }))} margin={{ top: 22, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke="#e7ecec" />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#ccd5d5' }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f5' }} contentStyle={TOOLTIP_STYLE}
                    formatter={(_value, _name, entry) => {
                      const row = entry.payload as (typeof years)[number];
                      return [row.percent === null ? 'No numeric readings' : `${row.percent}% (${row.breaches} of ${row.numeric})`, 'Breach share'];
                    }} />
                  <Bar dataKey="value" fill={BAR_COLOR} radius={[4, 4, 0, 0]} barSize={56}>
                    <LabelList dataKey="numeric" position="top" style={{ fontSize: 13, fill: '#263334' }}
                      formatter={(value) => `n = ${value}`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>
    </section>
  );
}

function Legend({ items }: { items: (string[])[] }) {
  return (
    <ul className="chart-legend">
      {items.map(([label, color, shape]) => (
        <li key={label}>
          <svg width="14" height="14" aria-hidden="true">
            {color === 'hatch' ? <><rect width="14" height="14" rx="3" fill="#eef1f1" /><path d="M0 14 L14 0 M-4 4 L4 -4 M10 18 L18 10" stroke={STATUS_COLORS.noData} strokeWidth="3" /></>
              : shape === 'triangle' ? <path d="M7 1 L13 13 H1 Z" fill={color} />
              : shape === 'diamond' ? <path d="M7 0 L14 7 L7 14 L0 7 Z" fill={color} />
              : <rect width="14" height="14" rx={shape === 'circle' ? 7 : 3} fill={color} />}
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}
