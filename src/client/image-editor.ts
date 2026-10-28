/** Local raster picker and cropper. Only the confirmed, resized crop is persisted. */
export type ImageKind = 'avatar' | 'background'
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export function cropRect(width: number, height: number, ratio: number, zoom: number, x: number, y: number) {
  const w = Math.min(width, height * ratio) / zoom
  const h = w / ratio
  return { x: (width - w) * x, y: (height - h) * y, width: w, height: h }
}

const copy = {
  zh: {
    avatar: '更换对话头像', background: '更换对话背景', choose: '选择图片',
    hint: '选择 PNG、JPEG 或 WebP（最大 20 MB）。拖动预览或调整滑块取景。',
    zoom: '缩放', x: '水平位置', y: '垂直位置', ratio: '裁剪比例',
    current: '当前对话比例', original: '原图比例', cancel: '取消', save: '裁剪并保存',
    reset: '恢复默认', invalid: '请选择不超过 20 MB 的 PNG、JPEG 或 WebP 图片。',
    error: '图片读取或保存失败，请重试。', saving: '正在保存…',
  },
  en: {
    avatar: 'Change chat avatar', background: 'Change chat background', choose: 'Choose image',
    hint: 'PNG, JPEG or WebP, up to 20 MB. Drag the preview or use the sliders to crop.',
    zoom: 'Zoom', x: 'Horizontal position', y: 'Vertical position', ratio: 'Crop ratio',
    current: 'Current conversation', original: 'Original image', cancel: 'Cancel', save: 'Crop and save',
    reset: 'Restore default', invalid: 'Choose a PNG, JPEG or WebP image up to 20 MB.',
    error: 'Could not read or save the image. Please try again.', saving: 'Saving…',
  },
}

export function imageCopy() {
  return copy[document.documentElement.lang.startsWith('zh') ? 'zh' : 'en']
}

/** A single editor owns its file URL, focus and async save lifecycle. */
export function openImageEditor(kind: ImageKind, save: (image: string) => Promise<unknown>): () => void {
  const t = imageCopy()
  const previousFocus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.dataset.qqImageEditor = kind
  dialog.setAttribute('aria-label', t[kind])
  dialog.style.cssText = 'box-sizing:border-box;width:min(640px,94vw);max-height:90vh;overflow:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;padding:24px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);font:14px/1.5 system-ui'
  const title = document.createElement('h2')
  title.textContent = t[kind]
  title.style.cssText = 'margin:0 0 12px;font-size:18px'
  const hint = document.createElement('p')
  hint.textContent = t.hint
  const file = document.createElement('input')
  file.type = 'file'
  file.accept = 'image/png,image/jpeg,image/webp'
  file.setAttribute('aria-label', t.choose)
  const preview = document.createElement('canvas')
  preview.style.cssText = 'display:block;width:100%;max-height:40vh;object-fit:contain;background:#eee;margin:16px 0;touch-action:none;cursor:move'
  preview.setAttribute('aria-label', t[kind])
  const status = document.createElement('p')
  status.setAttribute('role', 'status')
  const controls = document.createElement('div')
  controls.style.cssText = 'display:grid;gap:12px'
  const footer = document.createElement('div')
  footer.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;margin-top:16px'
  let closed = false
  let busy = false
  let image: HTMLImageElement | undefined
  let objectUrl: string | undefined
  let generation = 0
  const viewport = document.querySelector('[data-conversation-scroll]')?.getBoundingClientRect()
  const viewportRatio = viewport?.width && viewport.height ? viewport.width / viewport.height : 16 / 9
  let ratio = kind === 'avatar' ? 1 : viewportRatio
  let zoom = 1
  let x = 0.5
  let y = 0.5

  const close = () => {
    if (closed) return
    closed = true
    generation++
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    dialog.close()
    dialog.remove()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
  function button(label: string, action: () => void) {
    const el = document.createElement('button')
    el.type = 'button'
    el.textContent = label
    el.style.cssText = 'padding:8px 14px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#eee);color:inherit;cursor:pointer;font:inherit'
    el.onclick = action
    footer.append(el)
    return el
  }
  const commit = async (value: string) => {
    if (busy || closed) return
    busy = true
    status.textContent = t.saving
    for (const el of dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select')) el.disabled = true
    try {
      if (await save(value) === false) throw new Error('Save rejected')
      close()
    } catch {
      if (!closed) status.textContent = t.error
    } finally {
      busy = false
      if (!closed) {
        for (const el of dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select')) el.disabled = false
        submit.disabled = !image
      }
    }
  }
  button(t.reset, () => { void commit('') })
  button(t.cancel, close)
  const submit = button(t.save, () => {
    if (!image) return
    try {
      const rect = cropRect(image.naturalWidth, image.naturalHeight, ratio, zoom, x, y)
      const output = document.createElement('canvas')
      const scale = Math.min(1, (kind === 'avatar' ? 512 : 1600) / Math.max(rect.width, rect.height))
      output.width = Math.max(1, Math.round(rect.width * scale))
      output.height = Math.max(1, Math.round(rect.height * scale))
      const ctx = output.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, output.width, output.height)
      const data = output.toDataURL('image/webp', 0.88)
      if (data.length > 3_000_000) throw new Error('Crop too large')
      void commit(data)
    } catch { status.textContent = t.error }
  })
  submit.disabled = true
  function draw() {
    if (!image || closed) return
    preview.width = Math.max(1, Math.round(480 * Math.min(1, ratio)))
    preview.height = Math.max(1, Math.round(480 / Math.max(1, ratio)))
    const rect = cropRect(image.naturalWidth, image.naturalHeight, ratio, zoom, x, y)
    preview.getContext('2d')?.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, preview.width, preview.height)
  }
  function slider(label: string, min: number, max: number, value: number, set: (value: number) => void) {
    const wrapper = document.createElement('label')
    wrapper.textContent = label
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(min)
    input.max = String(max)
    input.step = '0.01'
    input.value = String(value)
    input.style.cssText = 'display:block;width:100%'
    input.oninput = () => { set(Number(input.value)); draw() }
    wrapper.append(input)
    controls.append(wrapper)
    return input
  }
  const zoomInput = slider(t.zoom, 1, 4, zoom, value => { zoom = value })
  const xInput = slider(t.x, 0, 1, x, value => { x = value })
  const yInput = slider(t.y, 0, 1, y, value => { y = value })
  const aspect = document.createElement('select')
  if (kind === 'background') {
    const label = document.createElement('label')
    label.textContent = t.ratio
    for (const [value, text] of [['current', t.current], ['16:9', '16:9'], ['4:3', '4:3'], ['9:16', '9:16'], ['original', t.original]]) {
      const option = document.createElement('option')
      option.value = value!
      option.textContent = text!
      aspect.append(option)
    }
    aspect.onchange = () => {
      const [w, h] = aspect.value.split(':').map(Number)
      ratio = aspect.value === 'current' ? viewportRatio
        : aspect.value === 'original' && image ? image.naturalWidth / image.naturalHeight : w! / h!
      draw()
    }
    label.append(aspect)
    controls.prepend(label)
  }
  let drag: { id: number; x: number; y: number } | undefined
  preview.onpointerdown = event => {
    if (!image || busy) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    preview.setPointerCapture(event.pointerId)
  }
  preview.onpointermove = event => {
    if (!drag || drag.id !== event.pointerId || !image) return
    const rect = cropRect(image.naturalWidth, image.naturalHeight, ratio, zoom, x, y)
    const box = preview.getBoundingClientRect()
    const scale = Math.min(box.width / rect.width, box.height / rect.height)
    x = Math.max(0, Math.min(1, x - (event.clientX - drag.x) / (scale * (image.naturalWidth - rect.width) || Infinity)))
    y = Math.max(0, Math.min(1, y - (event.clientY - drag.y) / (scale * (image.naturalHeight - rect.height) || Infinity)))
    xInput.value = String(x)
    yInput.value = String(y)
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    draw()
  }
  preview.onpointerup = preview.onpointercancel = () => { drag = undefined }
  file.onchange = () => {
    const selected = file.files?.[0]
    const ticket = ++generation
    image = undefined
    submit.disabled = true
    preview.getContext('2d')?.clearRect(0, 0, preview.width, preview.height)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = undefined
    if (!selected) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || selected.size > MAX_IMAGE_BYTES) {
      status.textContent = t.invalid
      return
    }
    status.textContent = ''
    const next = new Image()
    next.onload = () => {
      if (closed || ticket !== generation) return
      if (!next.naturalWidth || !next.naturalHeight || next.naturalWidth * next.naturalHeight > 100_000_000) {
        status.textContent = t.invalid
        return
      }
      image = next
      zoom = 1; x = y = 0.5
      zoomInput.value = '1'; xInput.value = yInput.value = '0.5'
      if (aspect.value === 'original') ratio = next.naturalWidth / next.naturalHeight
      submit.disabled = false
      draw()
    }
    next.onerror = () => { if (!closed && ticket === generation) status.textContent = t.error }
    objectUrl = URL.createObjectURL(selected)
    next.src = objectUrl
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy) close() })
  dialog.append(title, hint, file, preview, controls, status, footer)
  document.body.append(dialog)
  dialog.showModal()
  file.focus()
  return close
}
