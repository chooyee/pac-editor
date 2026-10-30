/*
 * Default picture upload: downscale large pictures and embed them as data URIs.
 * Fine for demos; in production pass `upload` to createEditor and return a URL from your media service.
 */
export async function dataUrlUpload(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('That file is not a picture');
  const raw = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(file); });
  if (/svg|gif/.test(file.type) || file.size < 300 * 1024) return raw;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not open the picture')); i.src = raw; });
  const max = 1600, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
}
