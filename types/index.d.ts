// Type definitions for pac-editor
export * from './render';
import type { Config, Data } from './render';

export interface EditorOptions {
  /** Components, categories and root. Default: defaultConfig. */
  config?: Config;
  /** Initial page data. Default: an empty page. */
  data?: Data;
  /** Called after every change with a copy of the page data. */
  onChange?: (data: Data) => void;
  /** Called when Publish is pressed. Return a promise to keep the button disabled until it settles.
   *  Without it, Publish opens a dialog showing the JSON and rendered HTML. */
  onPublish?: (data: Data) => void | Promise<void>;
  /** Upload a picture and return its URL. Default: config.upload, else embed as a data URI. */
  upload?: (file: File) => Promise<string>;
  /** Quill 2 class for rich text. Default: window.Quill. Pass null to use plain textareas. */
  quill?: any;
  /** localStorage key for an autosaved draft. When a valid draft exists it is loaded instead of `data`. */
  storageKey?: string;
  /** Remember open/closed panels in localStorage (default true, key "pac-editor:ui"); a string sets the key. */
  rememberLayout?: boolean | string;
  /** 'auto' (default) follows the operating system. */
  theme?: 'auto' | 'light' | 'dark';
  /** Text at the top left. Default "Page Builder". */
  title?: string;
  /** Label of the publish button. Default "Publish". */
  publishLabel?: string;
  /** Show the Import button. Default true. */
  showImport?: boolean;
  /** Page data offered by "Load example" in the Import dialog. */
  exampleData?: Data;
  /** Show the Desktop / Tablet / Mobile preview buttons. Default true. */
  viewports?: boolean;
}

export declare class Editor {
  constructor(target: HTMLElement | string, options?: EditorOptions);
  readonly root: HTMLElement;
  readonly config: Config;
  /** A copy of the current page data. */
  getData(): Data;
  /** Replace the page data (validated). Clears undo history unless keepHistory is true. */
  setData(data: Data, options?: { keepHistory?: boolean }): void;
  undo(): void;
  redo(): void;
  /** Select a block by id; null selects the page settings. */
  select(id: string | null, scrollIntoView?: boolean): void;
  setTheme(theme: 'auto' | 'light' | 'dark'): void;
  /** Open or close the blocks ('left') or properties ('right') panel. */
  setPanel(side: 'left' | 'right', open: boolean): void;
  /** Remove the editor's markup and every listener it added. */
  destroy(): void;
}

/** Mount an editor into an element (or the first element matching a selector). */
export function createEditor(target: HTMLElement | string, options?: EditorOptions): Editor;
/** Default picture upload: downscales large pictures and returns a data URI. */
export function dataUrlUpload(file: File): Promise<string>;
export const version: string;
