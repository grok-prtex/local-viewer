/**
 * ビューアの中だけで効く拡大縮小ジェスチャー。
 * Ctrl+ホイール（トラックパッドのピンチも Ctrl+ホイールとして届きます）、Safari の gesture イベント、
 * タッチの 2 本指ピンチを横取りし、ブラウザ自体のページ拡大を起こさないようにします。
 */
export interface GestureHandlers {
  zoom: (factor: number, cx: number, cy: number) => void;
  pan?: (dx: number, dy: number) => void;
  /** Ctrl なしのホイールでも拡大縮小するか（画像ビューア） */
  plainWheelZooms?: boolean;
  onPinchStart?: () => void;
}

export function attachZoomGestures(el: HTMLElement, h: GestureHandlers): () => void {
  const rel = (x: number, y: number) => { const r = el.getBoundingClientRect(); return [x - r.left, y - r.top] as const; };
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey && !h.plainWheelZooms) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const k = e.ctrlKey ? 0.01 : 0.002;
    const f = Math.exp(-Math.max(-50, Math.min(50, e.deltaY * unit * k)));
    const [x, y] = rel(e.clientX, e.clientY); h.zoom(f, x, y);
  };
  // Safari（macOS / iOS）
  let gs = 1;
  const gStart = (e: Event) => { e.preventDefault(); gs = 1; h.onPinchStart?.(); };
  const gChange = (e: Event) => {
    e.preventDefault();
    const g = e as Event & { scale: number; clientX: number; clientY: number };
    const f = g.scale / gs; gs = g.scale;
    const [x, y] = rel(g.clientX, g.clientY); h.zoom(f, x, y);
  };
  // タッチの 2 本指
  let last: { d: number; x: number; y: number } | null = null;
  const two = (t: TouchList) => {
    const a = t[0], b = t[1];
    return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  };
  const tStart = (e: TouchEvent) => { if (e.touches.length === 2) { e.preventDefault(); last = two(e.touches); h.onPinchStart?.(); } };
  const tMove = (e: TouchEvent) => {
    if (e.touches.length !== 2 || !last) return;
    e.preventDefault();
    const n = two(e.touches);
    const [x, y] = rel(n.x, n.y);
    if (last.d > 0) h.zoom(n.d / last.d, x, y);
    h.pan?.(n.x - last.x, n.y - last.y);
    last = n;
  };
  const tEnd = (e: TouchEvent) => { if (e.touches.length < 2) last = null; };
  const opt = { passive: false } as AddEventListenerOptions;
  el.addEventListener('wheel', onWheel, opt);
  el.addEventListener('gesturestart', gStart, opt);
  el.addEventListener('gesturechange', gChange, opt);
  el.addEventListener('gestureend', gStart, opt);
  el.addEventListener('touchstart', tStart, opt);
  el.addEventListener('touchmove', tMove, opt);
  el.addEventListener('touchend', tEnd);
  return () => {
    el.removeEventListener('wheel', onWheel); el.removeEventListener('gesturestart', gStart);
    el.removeEventListener('gesturechange', gChange); el.removeEventListener('gestureend', gStart);
    el.removeEventListener('touchstart', tStart); el.removeEventListener('touchmove', tMove); el.removeEventListener('touchend', tEnd);
  };
}
