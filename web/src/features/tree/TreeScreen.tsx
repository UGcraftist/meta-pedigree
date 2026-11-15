import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAuth } from '../../auth/AuthProvider';
import type { TreeData } from '../../lib/api';
import { applyFocus, readFocus } from '../../lib/urlState';
import { buildForest, PREDICATE_LABEL, type ForestNode } from './layout';
import { DetailDrawer } from './DetailDrawer';
import { useTheme } from '../../lib/theme';

interface LaidNode {
  id: string;
  label: string;
  kind: string;
  country: string | null;
  founded: string | null;
  precision: string;
  x: number;
  y: number;
  depth: number;
  parents: ForestNode['parents'];
  childCount: number;
  collapsed: boolean;
}

const YEAR_PRECISION: Record<string, string> = { day: 'D', month: 'M', year: 'Y', unknown: '?' };

function treeChildren(n: ForestNode, collapsed: Set<string>): ForestNode[] {
  return collapsed.has(n.id) ? [] : n.children;
}

export function TreeScreen({ data }: { data: TreeData }) {
  const { signOut } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [table, setTable] = useState(false);
  const [zoomReset, setZoomReset] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(() => readFocus(window.location.search));
  const [focusNotice, setFocusNotice] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [box, setBox] = useState({ width: 900, height: 600 });

  const forest = useMemo(() => buildForest(data.nodes, data.edges), [data]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of data.nodes) map.set(n.id, n.name);
    return map;
  }, [data.nodes]);

  const focusNode = useCallback((id: string | null) => {
    setFocusId(id);
    applyFocus(id);
  }, []);

  // A stale or unknown deep link is dropped with a one-line notice, never
  // guessed or silently re-pointed at another object (ux.md, URL state).
  useEffect(() => {
    if (!focusId || forest.all.has(focusId)) return;
    setFocusNotice(`链接里的对象 ${focusId} 不在当前可见数据中，已忽略该焦点。`);
    focusNode(null);
  }, [focusId, forest, focusNode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusId) focusNode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusId, focusNode]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox({ width: el.clientWidth, height: Math.max(520, Math.min(880, window.innerHeight - 220)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { laid, links, contentWidth, contentHeight } = useMemo(() => {
    // Each connected component (a root and its descendants) is laid out as its
    // own small tree, then components are packed into rows that fit the canvas
    // width. Packing keeps ~20 isolated roots readable instead of forcing one
    // 4000px-wide row that the SVG scales down to unreadable text.
    const NODE_W = 210;
    const NODE_H = 132;
    const PAD = 48;
    const GAP_X = 152;
    const GAP_Y = 72;

    interface Component {
      root: ForestNode;
      nodes: { data: ForestNode; x: number; depth: number }[];
      width: number;
      height: number;
    }

    const components: Component[] = [];
    for (const root of forest.roots) {
      const h = d3.hierarchy<ForestNode>(root, (n) => treeChildren(n, collapsed));
      d3.tree<ForestNode>().nodeSize([NODE_W, NODE_H])(h);
      let minX = Infinity;
      let maxX = -Infinity;
      let maxDepth = 0;
      h.each((d) => {
        minX = Math.min(minX, d.x ?? 0);
        maxX = Math.max(maxX, d.x ?? 0);
        maxDepth = Math.max(maxDepth, d.depth ?? 0);
      });
      const shift = minX === Infinity ? 0 : -minX;
      components.push({
        root,
        nodes: h
          .descendants()
          .map((d) => ({ data: d.data, x: (d.x ?? 0) + shift, depth: d.depth ?? 0 })),
        width: maxX - minX,
        height: maxDepth * NODE_H,
      });
    }

    const avail = Math.max(box.width - PAD * 2, 640);
    const placed: { comp: Component; ox: number; oy: number }[] = [];
    let cursorX = PAD;
    let cursorY = PAD;
    let rowHeight = 0;
    for (const comp of components) {
      const span = comp.width + NODE_W;
      if (cursorX > PAD && cursorX + span > PAD + avail) {
        cursorX = PAD;
        cursorY += rowHeight + GAP_Y;
        rowHeight = 0;
      }
      placed.push({ comp, ox: cursorX + NODE_W / 2, oy: cursorY + NODE_H / 2 });
      cursorX += span + GAP_X;
      rowHeight = Math.max(rowHeight, comp.height);
    }

    const nodes: LaidNode[] = [];
    const l: { from: LaidNode; to: LaidNode; label: string }[] = [];
    for (const { comp, ox, oy } of placed) {
      const local = new Map<string, LaidNode>();
      for (const { data, x, depth } of comp.nodes) {
        const node: LaidNode = {
          id: data.id,
          label: data.name,
          kind: data.kind,
          country: data.country,
          founded: data.founded,
          precision: data.foundedPrecision,
          x: ox + x,
          y: oy + depth * NODE_H,
          depth,
          parents: data.parents,
          childCount: data.children.length,
          collapsed: collapsed.has(data.id),
        };
        local.set(data.id, node);
        nodes.push(node);
      }
      for (const node of local.values()) {
        for (const child of forest.all.get(node.id)?.children ?? []) {
          const to = local.get(child.id);
          if (!to) continue;
          const edge = to.parents.find((p) => p.parentName === node.label);
          l.push({ from: node, to, label: edge ? (PREDICATE_LABEL[edge.predicate] ?? edge.predicate) : '' });
        }
      }
    }

    const rightmost = placed.reduce(
      (m, p) => Math.max(m, p.ox - NODE_W / 2 + p.comp.width + NODE_W + PAD),
      box.width,
    );
    const bottom =
      placed.length === 0 ? box.height : cursorY + rowHeight + NODE_H * 2 + PAD;
    return { laid: nodes, links: l, contentWidth: rightmost, contentHeight: bottom };
  }, [forest, collapsed, box.width, box.height]);

  const zoomTo = useCallback((k: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z) return;
    d3.select(svg).transition().duration(220).call(z.transform, d3.zoomIdentity.scale(k));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.2])
      .on('zoom', (ev) => {
        d3.select(svg).select('g.canvas').attr('transform', ev.transform.toString());
      });
    zoomRef.current = z;
    d3.select(svg).call(z);
    d3.select(svg).select('g.canvas').attr('transform', d3.zoomIdentity.toString());
  }, []);

  useEffect(() => {
    if (zoomReset > 0) zoomTo(1);
  }, [zoomReset, zoomTo]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const linkPath = d3.linkVertical<{ source: [number, number]; target: [number, number] }, [number, number]>()
    .x((p) => p[0])
    .y((p) => p[1]);

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Meta Pedigree <span className="tag">内部预览</span></h1>
          <p className="muted">具身智能谱系 · {data.nodes.length} 个组织 · {data.edges.length} 条亲缘边</p>
        </div>
        <div className="head-actions">
          <div className="switcher" role="tablist" aria-label="视图切换">
            <button role="tab" aria-selected="true" className="on">谱系树</button>
            <button role="tab" aria-selected="false" disabled title="M2 启用">时间轴</button>
            <button role="tab" aria-selected="false" disabled title="M2 启用">关系网</button>
          </div>
          <button className="ghost" onClick={() => { setCollapsed(new Set()); setZoomReset((v) => v + 1); }}>全部展开</button>
          <button className="ghost" onClick={() => { setCollapsed(new Set(forest.all.keys())); setZoomReset((v) => v + 1); }}>全部收起</button>
          <button className="ghost" onClick={() => setTable((v) => !v)}>{table ? '返回图表' : '表格视图'}</button>
          <button className="ghost" onClick={toggleTheme} title="切换深浅色">
            {theme === 'dark' ? '浅色' : '深色'}
          </button>
          <button className="ghost" onClick={() => void signOut()}>退出</button>
        </div>
      </header>

      {focusNotice && (
        <div className="banner" role="status">
          <span>{focusNotice}</span>
          <button className="ghost" onClick={() => setFocusNotice(null)}>知道了</button>
        </div>
      )}

      <div className={`screen-body${focusId ? ' with-drawer' : ''}`}>
        {table ? (
        <div className="table-wrap">
          <table>
            <caption>谱系数据（与图表同一数据源；无障碍替代）</caption>
            <thead>
              <tr><th>组织</th><th>国家</th><th>成立</th><th>父组织（全部）</th><th>子组织数</th></tr>
            </thead>
            <tbody>
              {data.nodes.map((n) => {
                const f = forest.all.get(n.id)!;
                return (
                  <tr key={n.id}>
                    <td>{n.name}</td>
                    <td>{n.country_code ?? '—'}</td>
                    <td>{n.founded_date ? `${n.founded_date.slice(0, 4)} (${YEAR_PRECISION[n.founded_precision]})` : '—'}</td>
                    <td>{f.parents.length ? f.parents.map((p) => `${p.parentName}（${PREDICATE_LABEL[p.predicate] ?? p.predicate}${p.date ? ` ${p.date.slice(0, 4)}` : ''}）`).join('；') : '根节点'}</td>
                    <td>{n.child_count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="canvas-wrap" ref={wrapRef}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${contentWidth} ${contentHeight}`}
            width="100%"
            height={box.height}
            role="img"
            aria-label="组织谱系树：点击节点查看详情，节点上的 + / − 展开或收起"
            className="tree-svg"
          >
            <g className="canvas">
              {links.map((l, i) => (
                <g key={`${l.from.id}-${l.to.id}-${i}`}>
                  <path
                    className="link"
                    d={linkPath({ source: [l.from.x, l.from.y], target: [l.to.x, l.to.y] }) ?? ''}
                  />
                  {l.label && (
                    <text className="link-label" x={(l.from.x + l.to.x) / 2 + 6} y={(l.from.y + l.to.y) / 2 - 2}>
                      {l.label}
                    </text>
                  )}
                </g>
              ))}
              {laid.map((n) => (
                <g
                  key={n.id}
                  className={`node${focusId === n.id ? ' focused' : ''}`}
                  transform={`translate(${n.x},${n.y})`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={focusId === n.id}
                  aria-expanded={n.childCount > 0 ? !n.collapsed : undefined}
                  onClick={() => focusNode(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      focusNode(n.id);
                    }
                  }}
                >
                  <title>
                    {n.label}
                    {n.parents.length > 1 ? `\n全部父组织：${n.parents.map((p) => `${p.parentName}（${PREDICATE_LABEL[p.predicate] ?? p.predicate}）`).join('；')}` : ''}
                  </title>
                  <circle className="dot" r={7} />
                  {n.founded && (
                    <text className="year" dy={-13} textAnchor="middle">
                      {n.founded.slice(0, 4)}{n.precision === 'year' ? '' : n.precision === 'month' ? '·M' : n.precision === 'day' ? '·D' : '?'}
                    </text>
                  )}
                  <text className="name" dy={20} textAnchor="middle">{n.label}</text>
                  {n.childCount > 0 && (
                    <g
                      className="toggle"
                      transform={`translate(0,9)`}
                      tabIndex={0}
                      role="button"
                      aria-label={n.collapsed ? `展开 ${n.label} 的子组织` : `收起 ${n.label} 的子组织`}
                      onClick={(e) => { e.stopPropagation(); toggle(n.id); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(n.id);
                        }
                      }}
                    >
                      <circle r={5.5} />
                      <text dy={3.2} textAnchor="middle">{n.collapsed ? '+' : '−'}</text>
                    </g>
                  )}
                  {n.parents.length > 1 && <circle className="multi" cx={10} cy={-9} r={2.6} />}
                </g>
              ))}
            </g>
          </svg>
          <p className="legend">
            点击节点 = 查看详情（Esc 关闭）；节点上的 + / − = 展开或收起。多父节点（蓝点）在表格视图中列出全部父边。树按控制权优先归属（Franka 归 Agile Robots，DLR 边保留在数据中）。
          </p>
        </div>
      )}
        {focusId && (
          <DetailDrawer
            orgId={focusId}
            nameById={nameById}
            onClose={() => focusNode(null)}
            onFocus={focusNode}
          />
        )}
      </div>
    </div>
  );
}
