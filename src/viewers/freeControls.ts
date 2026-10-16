import * as THREE from 'three';

/**
 * CAD 風の自由回転操作。OrbitControls と違い真上・真下で止まらず、カメラの上方向ごと
 * クォータニオンで回すので、全方向に回して裏返すこともできます。
 * 左ドラッグ：回転／右ドラッグ・中ドラッグ・Shift+左：パン／ホイール：ズーム
 * タッチ：1 本指で回転、2 本指でパン＋ピンチズーム
 */
export class FreeControls {
  target = new THREE.Vector3();
  rotateSpeed = 3.2;
  private ptrs = new Map<number, { x: number; y: number }>();
  private mode: 'rotate' | 'pan' | null = null;
  private last = { x: 0, y: 0, d: 0 };
  constructor(private camera: THREE.PerspectiveCamera, private el: HTMLElement) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', this.onCtx);
  }
  /** 上方向をカメラの向きと直交させて、注視点を向かせます */
  update() {
    const dir = this.target.clone().sub(this.camera.position);
    if (dir.lengthSq() < 1e-20) return;
    dir.normalize();
    const up = this.camera.up.clone().sub(dir.clone().multiplyScalar(this.camera.up.dot(dir)));
    if (up.lengthSq() < 1e-12) up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion));
    this.camera.up.copy(up.normalize());
    this.camera.lookAt(this.target);
  }
  /** 画面上の移動量（px）で回します。横は画面の上方向軸、縦は画面の右方向軸まわり */
  rotate(dx: number, dy: number) {
    const h = this.el.clientHeight || 1;
    const ax = (dx / h) * this.rotateSpeed, ay = (dy / h) * this.rotateSpeed;
    this.update();
    const up = this.camera.up.clone();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const q = new THREE.Quaternion().setFromAxisAngle(up, -ax).multiply(new THREE.Quaternion().setFromAxisAngle(right, -ay));
    const off = this.camera.position.clone().sub(this.target).applyQuaternion(q);
    this.camera.position.copy(this.target).add(off);
    this.camera.up.applyQuaternion(q);
    this.update();
  }
  pan(dx: number, dy: number) {
    const dist = this.camera.position.distanceTo(this.target);
    const k = (2 * dist * Math.tan((this.camera.fov * Math.PI) / 360)) / (this.el.clientHeight || 1);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const mv = right.multiplyScalar(-dx * k).add(up.multiplyScalar(dy * k));
    this.camera.position.add(mv); this.target.add(mv);
  }
  zoom(f: number) {
    const off = this.camera.position.clone().sub(this.target);
    const len = Math.max(off.length() * f, this.camera.near * 2);
    this.camera.position.copy(this.target).add(off.setLength(len));
  }
  private onCtx = (e: Event) => e.preventDefault();
  private onDown = (e: PointerEvent) => {
    this.el.setPointerCapture?.(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size === 1) {
      this.mode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'rotate';
      this.last = { x: e.clientX, y: e.clientY, d: 0 };
    } else if (this.ptrs.size === 2) { this.mode = 'pan'; this.last = this.two(); }
  };
  private two() {
    const [a, b] = [...this.ptrs.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  private onMove = (e: PointerEvent) => {
    if (!this.ptrs.has(e.pointerId)) return;
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size >= 2) {
      const n = this.two();
      this.pan(n.x - this.last.x, n.y - this.last.y);
      if (this.last.d > 0 && n.d > 0) this.zoom(this.last.d / n.d);
      this.last = n; return;
    }
    const dx = e.clientX - this.last.x, dy = e.clientY - this.last.y;
    this.last = { x: e.clientX, y: e.clientY, d: 0 };
    if (this.mode === 'rotate') this.rotate(dx, dy); else if (this.mode === 'pan') this.pan(dx, dy);
  };
  private onUp = (e: PointerEvent) => {
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size === 1) { const [p] = [...this.ptrs.values()]; this.mode = 'rotate'; this.last = { x: p.x, y: p.y, d: 0 }; }
    if (this.ptrs.size === 0) this.mode = null;
  };
  private onWheel = (e: WheelEvent) => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * 0.0015)); };
  dispose() {
    const el = this.el;
    el.removeEventListener('pointerdown', this.onDown); el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerup', this.onUp); el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('wheel', this.onWheel); el.removeEventListener('contextmenu', this.onCtx);
  }
}
