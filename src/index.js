/*
 * pac-editor — framework-free page builder with a Puck-style data model.
 * Browser entry: the editor plus everything from ./render.js.
 */
export * from './render.js';
export { createEditor, Editor } from './editor/editor.js';
export { dataUrlUpload } from './editor/upload.js';
export const version = '__VERSION__';
