/** fontkit は型定義を同梱していないため、使う部分だけ宣言します */
declare module 'fontkit' {
  export interface FkAxis { name: string; min: number; default: number; max: number; }
  export interface FkFont {
    postscriptName?: string; fullName?: string; familyName?: string; subfamilyName?: string; version?: string; copyright?: string;
    numGlyphs: number; unitsPerEm: number; characterSet: number[];
    variationAxes: Record<string, FkAxis>;
    getName?: (key: string, lang?: string) => string | null;
    type?: string; fonts?: FkFont[];
  }
  export function create(buf: Uint8Array, postscriptName?: string): FkFont;
}
