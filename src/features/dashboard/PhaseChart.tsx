import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Criterion } from '../../shared/types';
import { formatCriterion, formatNumber, seriesColor, shortParameter, type PhaseChart as PhaseChartData } from './model';

interface PhaseChartProps {
  chart: PhaseChartData;
  criterion: Criterion | null;
  unit: string;
}

// One parameter per chart (one y-axis). Series are year/festival periods; null
// values are never connected, so censored, missing and absent slots stay gaps.
export function PhaseChart({ chart, criterion, unit }: PhaseChartProps) {
  const name = shortParameter(chart.parameter);
  const limit = criterion?.type === 'min' ? criterion.min : criterion?.type === 'max' ? criterion.max : null;
  const summary = `${name} by phase for ${chart.series.map((series) => series.label).join(', ')}. `
    + `${chart.numericPoints} numeric readings plotted; other slots are gaps. `
    + `Class B comparison ${formatCriterion(criterion)}. Values are listed in the evidence table below.`;

  return (
    <figure className="phase-chart">
      <figcaption>
        <strong>{name}{unit ? ` (${unit})` : ''}</strong>
        <span>Class B {formatCriterion(criterion)}</span>
      </figcaption>
      {chart.numericPoints === 0 ? (
        <p className="chart-empty">No numeric {name} readings in this scope. Nothing is plotted; this is not a clean result.</p>
      ) : (
        <div className="chart-frame" role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={chart.rows} margin={{ top: 10, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#e2e7e7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6d7779' }} tickLine={false} axisLine={{ stroke: '#ccd5d5' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6d7779' }} tickLine={false} axisLine={false} width={44}
                domain={[0, 'auto']} allowDecimals />
              {limit !== null && <ReferenceLine y={limit} stroke="#6d7779" strokeDasharray="2 3"
                label={{ value: `Class B ${formatNumber(limit)}`, position: 'insideTopRight', fontSize: 10, fill: '#6d7779' }} />}
              <Tooltip formatter={(value, series) => [value === null || value === undefined ? 'No numeric reading' : `${value}${unit ? ` ${unit}` : ''}`, series]}
                contentStyle={{ fontSize: 12, borderColor: '#ccd5d5' }} />
              {chart.series.map((series) => (
                <Line key={series.key} dataKey={series.key} name={series.label} type="linear" connectNulls={false}
                  stroke={seriesColor(series.key)} strokeWidth={2}
                  strokeDasharray={series.festival === 'Durga' ? '6 3' : undefined}
                  dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: seriesColor(series.key) }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {chart.series.length > 0 && <ul className="chart-legend" aria-label={`${name} chart legend`}>
        {chart.series.map((series) => (
          <li key={series.key}>
            <svg width="22" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="21" y2="4" stroke={seriesColor(series.key)} strokeWidth="2"
                strokeDasharray={series.festival === 'Durga' ? '6 3' : undefined} />
            </svg>
            {series.label}
          </li>
        ))}
      </ul>}
    </figure>
  );
}
