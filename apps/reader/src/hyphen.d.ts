declare module 'hyphen/en-gb' {
  export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number; debug?: boolean }): string;
}
