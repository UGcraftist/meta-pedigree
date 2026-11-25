import { useEffect, useRef, useState } from 'react';
import { ApiError, fetchOrgDetail } from '../../lib/api';
import type { OrgDetailRow, OrgFactRow } from '../../lib/types';
import { factView, type FactSegment } from './triple';
import { formatDate, formatSpan, PRECISION_LABEL } from './format';
import { PREDICATE_LABEL } from './layout';

// Keys come from the pg enum public.org_kind (0001_init.sql).
const KIND_LABEL: Record<string, string> = {
  company: '公司',
  lab: '实验室',
  program: '项目',
  team: '团队',
  government: '政府',
  other: '其他',
};

interface DetailDrawerProps {
  orgId: string;
  nameById: Map<string, string>;
  /** Canonical share link for the current state, built by the URL-state controller. */
  copyUrl: string;
  onClose: () => void;
  onFocus: (id: string) => void;
}

/**
 * One end of a triple: emphasised when it is the org being viewed; a public
 * org is navigable, a person is not (S-02 has no person screen), and a gated
 * end renders its explicit fallback text instead of disappearing.
 */
function FactEndView({ seg, onFocus }: { seg: FactSegment; onFocus: (id: string) => void }) {
  if (seg.focusable && seg.end.id) {
    return (
      <button
        className={seg.emphasized ? 'linklike self-end' : 'linklike'}
        onClick={() => onFocus(seg.end.id!)}
      >
        {seg.text}
      </button>
    );
  }
  return <span className={seg.emphasized ? 'self-end' : undefined}>{seg.text}</span>;
}

function FactItem({
  fact,
  orgId,
  onFocus,
}: {
  fact: OrgFactRow;
  orgId: string;
  onFocus: (id: string) => void;
}) {
  // org_detail (0005) resolves BOTH ends server-side. factView fixes the order
  // (subject first) so viewing the object side cannot invert the sentence, and
  // returns object = null for facts that genuinely have no object end
  // (e.g. "founded") — those render the predicate alone, not a hidden tail.
  const view = factView(fact, orgId);
  const label = fact.label_zh ?? PREDICATE_LABEL[fact.predicate] ?? fact.predicate;
  const span = formatSpan(fact.start_date, fact.start_precision, fact.end_date, fact.end_precision);
  const precision = PRECISION_LABEL[fact.start_precision];
  const unsourced = fact.no_source || fact.sources.length === 0;

  return (
    <li className="fact">
      <div className="fact-head">
        <span className="fact-triple">
          <FactEndView seg={view.subject} onFocus={onFocus} />
          <span className="predicate"> · {label}</span>
          {view.object && (
            <>
              <span className="predicate"> · </span>
              <FactEndView seg={view.object} onFocus={onFocus} />
            </>
          )}
        </span>
        <span className="fact-when">
          {span}
          {span !== '时间未知' && precision && precision !== '未知' && (
            <span className="precision">（{precision}精度）</span>
          )}
        </span>
      </div>
      {unsourced ? (
        <span className="badge nosource" title="这条事实没有来源记录">无来源</span>
      ) : (
        <ul className="sources">
          {fact.sources.map((source, i) => (
            <li key={`${source.title}-${i}`}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              ) : (
                <span>{source.title}</span>
              )}
              {source.kind && <span className="muted">（{source.kind}）</span>}
              {source.locator && <span className="muted"> · {source.locator}</span>}
              {source.quote && <q className="quote">{source.quote}</q>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** S-02 detail drawer (T-006): one org, its published facts and their sources. */
export function DetailDrawer({ orgId, nameById, copyUrl, onClose, onFocus }: DetailDrawerProps) {
  const [detail, setDetail] = useState<OrgDetailRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');
  const copyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    setCopyState('idle');
    fetchOrgDetail(orgId)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof ApiError ? e.message : String(e));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [orgId, attempt]);

  const copy = async () => {
    setCopyState('idle');
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopyState('done');
    } catch {
      setCopyState('failed');
    }
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyState('idle'), 2500);
  };

  return (
    <aside className="drawer" aria-label="对象详情">
      <div className="drawer-head">
        <h2>{detail?.name ?? nameById.get(orgId) ?? '对象详情'}</h2>
        <button className="ghost" onClick={onClose} aria-label="关闭详情">×</button>
      </div>

      {loading && <p className="muted">载入详情…</p>}
      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          <button className="ghost" onClick={() => setAttempt((n) => n + 1)}>重试</button>
        </div>
      )}
      {!loading && !error && !detail && (
        <p className="muted">该对象不存在，或当前账号看不到它的详情。</p>
      )}

      {detail && (
        <>
          <p className="meta">
            {KIND_LABEL[detail.kind] ?? detail.kind}
            {' · '}
            {detail.country_code ?? '国家未知'}
            {' · 成立 '}
            {formatDate(detail.founded_date, detail.founded_precision) || '未知'}
          </p>
          <div className="drawer-actions">
            <button className="ghost" onClick={() => void copy()}>
              {copyState === 'done' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制链接'}
            </button>
            <span className="muted">
              {copyState === 'failed' ? '请手动复制地址栏' : '地址栏链接可直接分享'}
            </span>
          </div>

          <h3>事实与来源 <span className="muted">({detail.facts.length})</span></h3>
          {detail.facts.length === 0 ? (
            <p className="muted">暂无已发布事实（可能未录入，或对当前账号不可见）。</p>
          ) : (
            <ul className="facts">
              {detail.facts.map((fact) => (
                <FactItem
                  key={fact.id}
                  fact={fact}
                  orgId={orgId}
                  onFocus={onFocus}
                />
              ))}
            </ul>
          )}
          {detail.notes && <p className="notes">{detail.notes}</p>}
        </>
      )}
    </aside>
  );
}
