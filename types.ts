
export interface RegExMatch {
  index: number;
  text: string;
}

export interface GeneratorResult {
  pattern: string;
  explanation: string;
  codeSnippets: {
    javascript: string;
    python: string;
    php: string;
  };
}

export type SearchMode = 'literal' | 'between' | 'smart' | 'gap';
export type BrushType = 'green' | 'red' | 'eraser';

export interface Annotation {
  id: string;
  start: number;
  end: number;
  type: 'match' | 'context';
}

export interface RegExFlags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  wholeWord: boolean;
  searchMode: SearchMode;
  startWord: string;
  endWord: string;
  wordA: string;
  wordB: string;
}
