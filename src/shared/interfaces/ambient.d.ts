/// <reference types="node" />

declare module 'qrcode-terminal' {
  interface GenerateOptions {
    small?: boolean;
  }
  export function generate(data: string, opts?: GenerateOptions): void;
  export function generate(data: string, cb: (qrcode: string) => void): void;
  export function generate(data: string, opts: GenerateOptions, cb: (qrcode: string) => void): void;
  export function setErrorLevel(errorLevel: 'L' | 'M' | 'Q' | 'H'): void;
}

declare module 'tinyurl' {
  export function shorten(longUrl: string, alias?: string): Promise<string>;
  export function resolve(shortUrl: string): Promise<string>;
}
