import { useEffect, useRef, useState } from 'react';
import { ApiError, fetchOrgDetail } from '../../lib/api';
import type { OrgDetailRow, OrgFactRow, OrgSourceRow } from '../../lib/types';
import { factView, type FactSegment } from './triple';
import { formatFactWhen, precisionSpan } from './format';
import { PREDICATE_LABEL } from './layout';
import { citationLine, groupFacts } from './facts';

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
 * org is navigable, a person is not (S-07's person screen lands with T-024), and a gated
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

function CitationButton({ source }: { source: OrgSourceRow }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(citationLine(source));
      setState('done');
    } catch {
      setState('failed');
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2500);
  };
  return (
    <button className="ghost" onClick={() => void copy()}>
      {state === 'done' ? '已复制引文' : state === 'failed' ? '复制失败' : '复制引文'}
    </button>
  );
}

/** One fact body: triple, when, sources/provenance or an explicit `无来源`. */
function FactBody({
  fact,
  orgId,
  onFocus,
}: {
  fact: OrgFactRow;
  orgId: string;
  onFocus: (id: string) => void;
}) {
  // org_detail resolves BOTH ends server-side. factView fixes the order
  // (subject first) so viewing the object side cannot invert the sentence.
  const view = factView(fact, orgId);
  const label = fact.label_zh ?? PREDICATE_LABEL[fact.predicate] ?? fact.predicate;
  const when = formatFactWhen(fact.start_date, fact.start_precision, fact.end_date, fact.end_precision);
  const interval = precisionSpan(fact.start_date, fact.start_precision);
  const unsourced = fact.no_source || fact.sources.length === 0;

  return (
    <div className="fact">
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
        <span className="fact-when" title={interval ? `${interval.from} – ${interval.to}` : undefined}>
          {when}
          {fact.start_precision === 'unknown' && <span className="precision">（精度未知）</span>}
          {fact.status === 'disputed' && <span className="badge disputed">争议</span>}
        </span>
      </div>
      {unsourced ? (
        <div className="fact-source">
          <span className="badge nosource" title="这条事实没有来源记录">无来源</span>
        </div>
      ) : (
        <div className="fact-source">
          <ul className="sources">
            {fact.sources.map((source, i) => (
              <li key={`${source.title}-${i}`}>
                {source.author && <span>{source.author} · </span>}
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                ) : (
                  <span>{source.title}</span>
                )}
                {source.kind && <span className="muted">（{source.kind}）</span>}
                {source.page && <span className="muted"> · {source.page}</span>}
                {source.locator && <span className="muted"> · {source.locator}</span>}
                {source.published_at && <span className="muted"> · 出版 {source.published_at.slice(0, 10)}</span>}
                {source.accessed_at && <span className="muted"> · 访问 {source.accessed_at.slice(0, 10)}</span>}
                {source.quote && <q className="quote">{source.quote}</q>}
                <CitationButton source={source} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FactItem({ fact, orgId, onFocus }: { fact: OrgFactRow; orgId: string; onFocus: (id: string) => void }) {
  return (
    <li className="fact-row">
      <FactBody fact={fact} orgId={orgId} onFocus={onFocus} />
    </li>
  );
}

/** One conflict group: same conflict_key, equal columns, no winner (FR-004). */
function ConflictItem({ facts, orgId, onFocus }: { facts: OrgFactRow[]; orgId: string; onFocus: (id: string) => void }) {
  const view = factView(facts[0], orgId);
  const label = facts[0].label_zh ?? PREDICATE_LABEL[facts[0].predicate] ?? facts[0].predicate;
  return (
    <li className="fact-row conflict">
      <div className="conflict-title">
        {view.subject.text} · {label}
        {view.object ? ` · ${view.object.text}` : ''}
        <span className="muted"> · 两说并存</span>
      </div>
      <div className="conflict-grid">
        {facts.map((fact) => (
          <FactBody key={fact.id} fact={fact} orgId={orgId} onFocus={onFocus} />
        ))}
      </div>
    </li>
  );
}

/** S-07 detail drawer (T-006): one org, its published and disputed facts and their sources. */
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
            {formatFactWhen(detail.founded_date, detail.founded_precision, null, null)}
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
            <p className="muted">暂无已发布或争议事实（可能未录入，或对当前账号不可见）。</p>
          ) : (
            <ul className="facts">
              {groupFacts(detail.facts).map((group) =>
                group.conflict ? (
                  <ConflictItem key={`conflict-${group.key}`} facts={group.facts} orgId={orgId} onFocus={onFocus} />
                ) : (
                  <FactItem key={group.facts[0].id} fact={group.facts[0]} orgId={orgId} onFocus={onFocus} />
                ),
              )}
            </ul>
          )}
          {detail.notes && <p className="notes">{detail.notes}</p>}
        </>
      )}
    </aside>
  );
}
