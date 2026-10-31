// Type definitions for pac-editor
export * from './render';
import type { Config, Data } from './render';

export interface ToolbarButton {
  /** Unique id; the button gets data-fp-btn="<id>". */
  id: string;
  /** Button text (escaped). Hidden on narrow screens when an icon is given. */
  label?: string;
  /** Tooltip. Defaults to the label when an icon is given. */
  title?: string;
  /** SVG markup inserted as-is, so only pass trusted markup. */
  icon?: string;
  /** Style it like the Publish button. */
  primary?: boolean;
  /** Runs on click. Return a promise to keep the button disabled until it settles; a rejection is shown as a toast. */
  onClick?: (editor: Editor, event: MouseEvent) => void | Promise<void>;
}

export interface ToolbarOptions {
  /** Undo and Redo buttons. Default true. */
  undo?: boolean;
  /** Desktop / Tablet / Mobile buttons. Default: the `viewports` option, else true. */
  viewports?: boolean;
  /** Preview button. Default true. */
  preview?: boolean;
  /** Import button. Default: the `showImport` option, else true. */
  import?: boolean;
  /** Publish button. Default true. */
  publish?: boolean;
  /** Your own buttons, placed before Publish. */
  buttons?: ToolbarButton[];
}

export interface EditorEvents {
  change: (data: Data) => void;
  select: (id: string | null) => void;
  preview: (on: boolean) => void;
  viewport: (name: 'desktop' | 'tablet' | 'mobile') => void;
  /** Publish was pressed (or publish() called), before onPublish runs. */
  publish: (data: Data) => void;
  /** A page was loaded from the Import dialog. */
  import: (data: Data) => void;
}

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
  /** Hide built-in toolbar buttons and add your own. */
  toolbar?: ToolbarOptions;
  /** Event handlers, the same as calling editor.on() for each. */
  on?: { [K in keyof EditorEvents]?: EditorEvents[K] };
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
  /** Listen for an editor event. Returns a function that removes the handler. */
  on<K extends keyof EditorEvents>(type: K, handler: EditorEvents[K]): () => void;
  off<K extends keyof EditorEvents>(type: K, handler: EditorEvents[K]): void;
  /** Same as the Publish button. */
  publish(): Promise<void>;
  /** Same as the Import button. */
  openImport(): void;
  /** Turn preview mode on or off. */
  setPreview(on: boolean): void;
  /** Set the canvas width. Works even when the viewport buttons are hidden. */
  setViewport(name: 'desktop' | 'tablet' | 'mobile'): void;
  /** Remove the editor's markup and every listener it added. */
  destroy(): void;
}

/** Mount an editor into an element (or the first element matching a selector). */
export function createEditor(target: HTMLElement | string, options?: EditorOptions): Editor;
/** Default picture upload: downscales large pictures and returns a data URI. */
export function dataUrlUpload(file: File): Promise<string>;
export const version: string;
