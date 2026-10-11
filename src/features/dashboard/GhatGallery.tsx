import { GhatArt, ghatArtInfo } from '../../shared/illustrations/GhatArt';
import type { SiteAnalysis } from '../../shared/types';
import { statusLabel } from './model';
import './analytics.css';

// Visual entry point to each ghat. Same Analysis order as the priority table.
export function GhatGallery({ sites, scoped, selectedSiteId, onSelectSite }: {
  sites: SiteAnalysis[]; scoped: boolean; selectedSiteId: string | null; onSelectSite: (siteId: string) => void;
}) {
  return (
    <section className="ghat-gallery" aria-label="Ghats at a glance">
      {sites.map((item) => {
        const status = statusLabel(item, scoped);
        const selected = item.site.id === selectedSiteId;
        const percent = item.breachFraction === null ? null : Math.round(item.breachFraction * 100);
        return (
          <button key={item.site.id} type="button" className={`ghat-card${selected ? ' selected' : ''}`}
            aria-pressed={selected} onClick={() => onSelectSite(item.site.id)}>
            <span className="ghat-card-art">
              <GhatArt siteId={item.site.id} />
              <span className={`rank-badge ${item.rank === null ? 'unranked' : item.zeroDo ? 'critical' : ''}`}>
                {item.rank === null ? 'Test' : `#${item.rank}`}
              </span>
            </span>
            <span className="ghat-card-body">
              <strong>{item.site.name}</strong>
              <small>{ghatArtInfo(item.site.id).label}</small>
              <span className={`status-label ${status.tone}`}>{status.text}</span>
              <span className="breach-meter" aria-hidden="true">
                <i style={{ width: `${percent ?? 0}%` }} className={percent === null ? 'empty' : ''} />
              </span>
              <span className="breach-meter-label">
                {percent === null ? 'No numeric readings' : `${item.benchmarkBreachCount}/${item.benchmarkNumericCount} breach · ${percent}%`}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
