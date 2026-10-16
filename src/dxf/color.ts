import * as THREE from 'three';

export type Bg = 'light' | 'dark' | 'jade';
export function adjust(rgb: number, m: Bg): THREE.Color {
  // AutoCAD の白↔黒と同じ考え方：白(ACI 7)は背景の反対色、それ以外も背景とのコントラスト比が 3 未満なら明度を動かして確保します
  if (rgb === 0xffffff || rgb === 0) return new THREE.Color(m === 'dark' ? 0xe8ebe6 : 0x2a2e32);
  const c = new THREE.Color(rgb); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  const bgL = lum(new THREE.Color(BG_RGB[m]));
  const ratio = (x: THREE.Color) => { const a = lum(x), b = bgL; return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  for (let i = 0; i < 40 && ratio(c) < MIN_CONTRAST; i++) {
    hsl.l = m === 'dark' ? Math.min(0.95, hsl.l + 0.025) : Math.max(0.05, hsl.l - 0.025);
    c.setHSL(hsl.h, hsl.s, hsl.l);
  }
  return c;
}
export const MIN_CONTRAST = 3;
export const BG_RGB = { light: 0xf4f5f3, dark: 0x1e2124, jade: 0xe8f0ec } as const;
/** 相対輝度（WCAG） */
export function lum(c: THREE.Color) { const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); const s = c.clone().convertLinearToSRGB(); return 0.2126 * f(s.r) + 0.7152 * f(s.g) + 0.0722 * f(s.b); }
