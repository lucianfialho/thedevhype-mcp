'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FileText, Link2, Sparkles, User, Building2, X, ExternalLink } from 'lucide-react';
import { getEntryDetail } from '../actions';
import type { Entry } from '@/app/lib/mcp/servers/otto.schema';

interface GraphNode {
  id: number;
  type: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphTabProps {
  nodes: Array<{ id: number; type: string; title: string }>;
  edges: Array<{ fromId: number; toId: number }>;
}

interface EntryDetail {
  entry: Entry;
  linked: Array<{ id: number; type: string; title: string }>;
}

const TYPE_COLORS: Record<string, string> = {
  note: '#8b5cf6',
  link: '#3b82f6',
  highlight: '#f59e0b',
  person: '#e11d48',
  company: '#10b981',
};

const ICON_SVGS: Record<string, string> = {
  note: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  link: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>',
  highlight: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/></svg>',
  person: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  company: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
};

const TYPE_LABELS: Record<string, string> = {
  note: 'Notes',
  link: 'Links',
  highlight: 'Highlights',
  person: 'People',
  company: 'Companies',
};

const LEGEND_ICONS: Record<string, typeof FileText> = {
  note: FileText,
  link: Link2,
  highlight: Sparkles,
  person: User,
  company: Building2,
};

const TYPE_CLASS: Record<string, string> = {
  note: 'text-violet-500',
  link: 'text-blue-500',
  highlight: 'text-amber-500',
  person: 'text-rose-600',
  company: 'text-emerald-500',
};

const TYPE_BADGE: Record<string, string> = {
  note: 'bg-purple-100 text-purple-700',
  link: 'bg-blue-100 text-blue-700',
  highlight: 'bg-amber-100 text-amber-700',
  person: 'bg-rose-100 text-rose-700',
  company: 'bg-emerald-100 text-emerald-700',
};

const NODE_RADIUS = 14;
const LABEL_FONT = '11px system-ui, sans-serif';
const CLICK_THRESHOLD = 5; // px — below this distance, mouseup counts as click

export function GraphTab({ nodes: rawNodes, edges }: GraphTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const iconImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const dragRef = useRef<{ node: GraphNode; offsetX: number; offsetY: number } | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ w: 400, h: 400 });
  const [selectedDetail, setSelectedDetail] = useState<EntryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Pre-load icon SVGs as images for canvas
  useEffect(() => {
    for (const [type, svg] of Object.entries(ICON_SVGS)) {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      iconImagesRef.current[type] = img;
    }
  }, []);

  // Initialize nodes with random positions
  useEffect(() => {
    const w = dimensions.w;
    const h = dimensions.h;
    const cx = w / 2;
    const cy = h / 2;

    nodesRef.current = rawNodes.map((n) => ({
      ...n,
      x: cx + (Math.random() - 0.5) * w * 0.6,
      y: cy + (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
    }));
  }, [rawNodes, dimensions]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.w * dpr;
    canvas.height = dimensions.h * dpr;
    canvas.style.width = `${dimensions.w}px`;
    canvas.style.height = `${dimensions.h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [dimensions]);

  // Force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderCtx = ctx;
    const nodeMap = new Map<number, GraphNode>();
    let tickCount = 0;

    function tick() {
      const nodes = nodesRef.current;
      const w = dimensions.w;
      const h = dimensions.h;
      const cx = w / 2;
      const cy = h / 2;

      nodeMap.clear();
      for (const n of nodes) nodeMap.set(n.id, n);

      const alpha = Math.max(0.01, 0.3 * Math.pow(0.995, tickCount));
      tickCount++;

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (300 * alpha) / dist;
          dx = (dx / dist) * force;
          dy = (dy / dist) * force;
          a.vx -= dx;
          a.vy -= dy;
          b.vx += dx;
          b.vy += dy;
        }
      }

      // Attraction (edges)
      for (const edge of edges) {
        const a = nodeMap.get(edge.fromId);
        const b = nodeMap.get(edge.toId);
        if (!a || !b) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 130) * 0.03 * alpha;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.vx += dx;
        a.vy += dy;
        b.vx -= dx;
        b.vy -= dy;
      }

      // Center gravity
      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.005 * alpha;
        n.vy += (cy - n.y) * 0.005 * alpha;
      }

      // Apply velocity + damping
      for (const n of nodes) {
        if (dragRef.current?.node === n) continue;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(NODE_RADIUS, Math.min(w - NODE_RADIUS, n.x));
        n.y = Math.max(NODE_RADIUS, Math.min(h - NODE_RADIUS, n.y));
      }

      // --- Render ---
      renderCtx.clearRect(0, 0, w, h);

      // Edges
      renderCtx.strokeStyle = '#e2e8f0';
      renderCtx.lineWidth = 1;
      for (const edge of edges) {
        const a = nodeMap.get(edge.fromId);
        const b = nodeMap.get(edge.toId);
        if (!a || !b) continue;
        renderCtx.beginPath();
        renderCtx.moveTo(a.x, a.y);
        renderCtx.lineTo(b.x, b.y);
        renderCtx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedDetail?.entry.id === n.id;
        const color = TYPE_COLORS[n.type] || '#64748b';
        const radius = isHovered || isSelected ? NODE_RADIUS + 3 : NODE_RADIUS;

        // Glow for hovered/selected
        if (isHovered || isSelected) {
          renderCtx.beginPath();
          renderCtx.arc(n.x, n.y, radius + 6, 0, Math.PI * 2);
          renderCtx.fillStyle = color + '20';
          renderCtx.fill();
        }

        // Background circle
        renderCtx.beginPath();
        renderCtx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        renderCtx.fillStyle = color;
        renderCtx.fill();

        // Border
        renderCtx.strokeStyle = isSelected ? '#1e293b' : '#fff';
        renderCtx.lineWidth = isSelected ? 3 : 2;
        renderCtx.stroke();

        // Lucide icon
        const iconImg = iconImagesRef.current[n.type];
        if (iconImg?.complete) {
          const iconSize = isHovered || isSelected ? 16 : 14;
          renderCtx.drawImage(iconImg, n.x - iconSize / 2, n.y - iconSize / 2, iconSize, iconSize);
        }
      }

      // Labels for hovered node and its neighbors
      if (hoveredNode) {
        const neighborIds = new Set<number>();
        for (const edge of edges) {
          if (edge.fromId === hoveredNode.id) neighborIds.add(edge.toId);
          if (edge.toId === hoveredNode.id) neighborIds.add(edge.fromId);
        }

        renderCtx.font = LABEL_FONT;
        renderCtx.textAlign = 'center';
        renderCtx.textBaseline = 'alphabetic';

        for (const n of nodes) {
          if (n.id !== hoveredNode.id && !neighborIds.has(n.id)) continue;
          const label = n.title.length > 25 ? n.title.slice(0, 25) + '...' : n.title;
          const tw = renderCtx.measureText(label).width;
          const px = 4;
          const py = 2;

          renderCtx.fillStyle = n.id === hoveredNode.id ? '#1e293b' : '#f1f5f9';
          const rx = n.x - tw / 2 - px;
          const ry = n.y - NODE_RADIUS - 22;
          const rw = tw + px * 2;
          const rh = 16 + py * 2;
          renderCtx.beginPath();
          renderCtx.roundRect(rx, ry, rw, rh, 6);
          renderCtx.fill();

          renderCtx.fillStyle = n.id === hoveredNode.id ? '#fff' : '#475569';
          renderCtx.fillText(label, n.x, n.y - NODE_RADIUS - 11);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [edges, dimensions, hoveredNode, selectedDetail]);

  const getNodeAt = useCallback((clientX: number, clientY: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const n of nodesRef.current) {
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy < (NODE_RADIUS + 6) * (NODE_RADIUS + 6)) return n;
    }
    return null;
  }, []);

  async function handleNodeClick(node: GraphNode) {
    setLoadingDetail(true);
    const detail = await getEntryDetail(node.id);
    if (detail) setSelectedDetail(detail);
    setLoadingDetail(false);
  }

  function handleMouseMove(e: React.MouseEvent) {
    const node = getNodeAt(e.clientX, e.clientY);
    setHoveredNode(node);

    if (dragRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dragRef.current.node.x = e.clientX - rect.left;
      dragRef.current.node.y = e.clientY - rect.top;
      dragRef.current.node.vx = 0;
      dragRef.current.node.vy = 0;
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dragRef.current = {
        node,
        offsetX: e.clientX - rect.left - node.x,
        offsetY: e.clientY - rect.top - node.y,
      };
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const down = mouseDownPos.current;
    const dragNode = dragRef.current?.node;
    dragRef.current = null;
    mouseDownPos.current = null;

    // Detect click (not drag)
    if (down && dragNode) {
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD) {
        handleNodeClick(dragNode);
      }
    }
  }

  // Touch handlers
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    const node = getNodeAt(touch.clientX, touch.clientY);
    if (node) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dragRef.current = {
        node,
        offsetX: touch.clientX - rect.left - node.x,
        offsetY: touch.clientY - rect.top - node.y,
      };
      setHoveredNode(node);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragRef.current.node.x = touch.clientX - rect.left;
    dragRef.current.node.y = touch.clientY - rect.top;
    dragRef.current.node.vx = 0;
    dragRef.current.node.vy = 0;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartPos.current;
    const dragNode = dragRef.current?.node;
    dragRef.current = null;
    touchStartPos.current = null;
    setHoveredNode(null);

    if (start && dragNode && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD) {
        handleNodeClick(dragNode);
      }
    }
  }

  if (rawNodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No entries yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Create notes, links, and highlights via MCP to see your knowledge graph.
        </p>
      </div>
    );
  }

  const detail = selectedDetail;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Graph</h3>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {Object.entries(TYPE_COLORS).map(([type]) => {
            const Icon = LEGEND_ICONS[type];
            return (
              <span key={type} className="flex items-center gap-1">
                {Icon && <Icon size={14} className={TYPE_CLASS[type]} />}
                {TYPE_LABELS[type]}
              </span>
            );
          })}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ height: 400 }}
      >
        <canvas
          ref={canvasRef}
          className="cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { dragRef.current = null; }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      <p className="text-center text-sm text-slate-400">
        {rawNodes.length} entries &middot; {edges.length} connections
        {!detail && ' &middot; Click a node to see details'}
      </p>

      {/* Detail panel */}
      {loadingDetail && (
        <div className="animate-pulse rounded-2xl border border-slate-200 p-5">
          <div className="mb-3 h-5 w-1/3 rounded bg-slate-100" />
          <div className="mb-2 h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      )}

      {detail && !loadingDetail && (
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[detail.entry.type] || 'bg-slate-100 text-slate-700'}`}>
                  {detail.entry.type}
                </span>
                <h4 className="min-w-0 truncate text-base font-semibold text-slate-800">
                  {detail.entry.title}
                </h4>
              </div>
              {detail.entry.url && (
                <a
                  href={detail.entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-sm text-blue-500 hover:underline"
                >
                  <ExternalLink size={12} />
                  {detail.entry.url}
                </a>
              )}
              {detail.entry.source && (
                <p className="mt-1 text-sm text-slate-500">Source: {detail.entry.source}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedDetail(null)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          {detail.entry.content && (
            <div className="mb-3 max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
              {detail.entry.content}
            </div>
          )}

          {/* Tags */}
          {detail.entry.tags && detail.entry.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {detail.entry.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Connected entries */}
          {detail.linked.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Connections ({detail.linked.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detail.linked.map((link) => {
                  const LinkIcon = LEGEND_ICONS[link.type];
                  return (
                    <button
                      key={link.id}
                      onClick={() => handleNodeClick({ ...link, x: 0, y: 0, vx: 0, vy: 0 })}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      {LinkIcon && <LinkIcon size={12} className={TYPE_CLASS[link.type]} />}
                      {link.title.length > 30 ? link.title.slice(0, 30) + '...' : link.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
