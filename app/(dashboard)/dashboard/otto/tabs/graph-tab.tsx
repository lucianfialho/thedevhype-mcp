'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface GraphNode {
  id: number;
  type: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  fromId: number;
  toId: number;
}

interface GraphTabProps {
  nodes: Array<{ id: number; type: string; title: string }>;
  edges: Array<{ fromId: number; toId: number }>;
}

const TYPE_COLORS: Record<string, string> = {
  note: '#8b5cf6',      // purple
  link: '#3b82f6',      // blue
  highlight: '#f59e0b',  // amber
};

const NODE_RADIUS = 6;
const LABEL_FONT = '11px system-ui, sans-serif';

export function GraphTab({ nodes: rawNodes, edges }: GraphTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ node: GraphNode; offsetX: number; offsetY: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ w: 400, h: 400 });

  // Initialize nodes with random positions
  useEffect(() => {
    const w = dimensions.w;
    const h = dimensions.h;
    const cx = w / 2;
    const cy = h / 2;

    nodesRef.current = rawNodes.map((n, i) => ({
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

      // --- Forces ---
      const alpha = Math.max(0.01, 0.3 * Math.pow(0.995, tickCount));
      tickCount++;

      // Repulsion (all pairs)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (150 * alpha) / dist;
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
        const force = (dist - 80) * 0.03 * alpha;
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
        // Keep in bounds
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
        const color = TYPE_COLORS[n.type] || '#64748b';
        const radius = isHovered ? NODE_RADIUS + 3 : NODE_RADIUS;

        // Glow for hovered
        if (isHovered) {
          renderCtx.beginPath();
          renderCtx.arc(n.x, n.y, radius + 4, 0, Math.PI * 2);
          renderCtx.fillStyle = color + '20';
          renderCtx.fill();
        }

        renderCtx.beginPath();
        renderCtx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        renderCtx.fillStyle = color;
        renderCtx.fill();

        // White border
        renderCtx.strokeStyle = '#fff';
        renderCtx.lineWidth = 2;
        renderCtx.stroke();
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

        for (const n of nodes) {
          if (n.id !== hoveredNode.id && !neighborIds.has(n.id)) continue;
          const label = n.title.length > 25 ? n.title.slice(0, 25) + '...' : n.title;
          const tw = renderCtx.measureText(label).width;
          const px = 4;
          const py = 2;

          // Background pill
          renderCtx.fillStyle = n.id === hoveredNode.id ? '#1e293b' : '#f1f5f9';
          const rx = n.x - tw / 2 - px;
          const ry = n.y - NODE_RADIUS - 20;
          const rw = tw + px * 2;
          const rh = 16 + py * 2;
          renderCtx.beginPath();
          renderCtx.roundRect(rx, ry, rw, rh, 6);
          renderCtx.fill();

          // Text
          renderCtx.fillStyle = n.id === hoveredNode.id ? '#fff' : '#475569';
          renderCtx.fillText(label, n.x, n.y - NODE_RADIUS - 9);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [edges, dimensions, hoveredNode]);

  // Mouse handlers
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

  function handleMouseUp() {
    dragRef.current = null;
  }

  // Touch handlers for mobile
  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
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

  function handleTouchEnd() {
    dragRef.current = null;
    setHoveredNode(null);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-slate-800">Graph</h3>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS.note }} />
            Notes
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS.link }} />
            Links
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS.highlight }} />
            Highlights
          </span>
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
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      <p className="text-center text-sm text-slate-400">
        {rawNodes.length} entries · {edges.length} connections
      </p>
    </div>
  );
}
