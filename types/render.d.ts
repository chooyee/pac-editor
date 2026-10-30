// Type definitions for pac-editor/render (no DOM required)

/* ---------------- page data (Puck-compatible) ---------------- */

export interface ComponentData<Props extends Record<string, any> = Record<string, any>> {
  type: string;
  props: Props & { id: string };
}

export interface Data<RootProps extends Record<string, any> = Record<string, any>> {
  root: { props: RootProps };
  content: ComponentData[];
}

/** Rich text value: a Quill Delta. Older data may hold a plain string. */
export interface Delta {
  ops: Array<{ insert: string | object; attributes?: Record<string, any> }>;
}

/* ---------------- fields ---------------- */

export interface FieldOption { label: string; value: string }
interface BaseField { label?: string }

export interface TextField extends BaseField { type: 'text'; placeholder?: string }
export interface TextareaField extends BaseField { type: 'textarea'; placeholder?: string }
export interface NumberField extends BaseField { type: 'number'; min?: number; max?: number; placeholder?: string }
export interface RichTextField extends BaseField { type: 'richtext' }
export interface SelectField extends BaseField { type: 'select'; options: FieldOption[] }
export interface RadioField extends BaseField { type: 'radio'; options: FieldOption[] }
export interface ImageField extends BaseField { type: 'image' }
export interface SlotField extends BaseField { type: 'slot' }
export interface ArrayField extends BaseField {
  type: 'array';
  arrayFields: Record<string, Field>;
  defaultItemProps?: Record<string, any>;
  /** Title shown on each item in the properties panel (defaults to the first field's value). */
  getItemSummary?: (item: Record<string, any>, index: number) => string;
  max?: number;
}
export interface ObjectField extends BaseField { type: 'object'; objectFields: Record<string, Field> }
export interface CustomField<Value = any> extends BaseField {
  type: 'custom';
  /** Return the control. Give the focusable element `id` so the label points at it. Call onChange to update the block. */
  render: (args: { id: string; field: CustomField<Value>; value: Value; onChange: (value: Value) => void }) => HTMLElement | null;
}

export type Field =
  | TextField | TextareaField | NumberField | RichTextField | SelectField | RadioField
  | ImageField | SlotField | ArrayField | ObjectField | CustomField;

/* ---------------- config ---------------- */

export interface RenderContext {
  /** Render the items stored in a slot field. */
  slot: (name: string) => string;
  /** True on the editor canvas, false in published output. */
  edit: boolean;
}

export interface ComponentConfig<Props extends Record<string, any> = Record<string, any>> {
  label?: string;
  /** Palette icon: inner SVG markup for a 24×24 viewBox, drawn with stroke="currentColor". */
  icon?: string;
  fields?: Record<string, Field>;
  defaultProps?: Partial<Props>;
  /** Return HTML. Escape every user value with esc() and pass URLs through safeUrl(). */
  render: (props: Props & { id: string }, ctx: RenderContext) => string;
}

export interface RootConfig<Props extends Record<string, any> = Record<string, any>> {
  fields?: Record<string, Field>;
  defaultProps?: Partial<Props>;
  render: (props: Props, ctx: { children: string; edit: boolean }) => string;
}

export interface Config {
  root: RootConfig;
  components: Record<string, ComponentConfig<any>>;
  /** Palette groups: category name → component names. Unlisted components go under "Other". */
  categories?: Record<string, string[]>;
  /** Picture upload used when no `upload` option is passed to createEditor. */
  upload?: (file: File) => Promise<string>;
}

/* ---------------- functions ---------------- */

/** Render page data to an HTML string. Pure; works on servers. */
export function render(config: Config, data: Partial<Data>): string;
/** Turn a rich text value (Delta or plain string) into safe HTML. */
export function renderRich(value: Delta | string | null | undefined): string;
export function toDelta(value: Delta | string | null | undefined): Delta;
export function richText(value: Delta | string | null | undefined): string;
export const RICH_FORMATS: string[];

export interface ValidationResult { ok: boolean; errors: string[] }
/** Check page data against a config before loading, rendering or saving it. */
export function validateData(config: Config, data: unknown): ValidationResult;
export function emptyData(config: Config): Data;
export function findById(config: Config, items: ComponentData[], id: string): { item: ComponentData; zone: ComponentData[]; index: number; zoneKey: string } | null;
export function slotNames(config: Config, type: string): string[];
export function countItems(config: Config, items: ComponentData[]): number;

/** Escape text for HTML. */
export function esc(value: unknown): string;
/** Allow http(s), mailto and relative links ('#' otherwise); with img=true allow http(s), relative and data:image ('' otherwise). */
export function safeUrl(url: unknown, img?: boolean): string;

/* ---------------- built-in blocks ---------------- */

export const defaultConfig: Config;
export const blocks: Record<'Image' | 'Hero' | 'Heading' | 'Text' | 'Notice' | 'Button' | 'Columns' | 'CardGrid' | 'Spacer', ComponentConfig>;
export const root: RootConfig;
export const alignField: RadioField;
/** Start from a base config (default: defaultConfig) and add, replace or remove (null) components and categories. */
export function extendConfig(extra?: {
  root?: RootConfig;
  components?: Record<string, ComponentConfig<any> | null>;
  categories?: Record<string, string[] | null>;
  upload?: Config['upload'];
}, base?: Config): Config;
