import Cropper from 'cropperjs'
import cropperCss from 'cropperjs/dist/cropper.css?inline'

/** Local-only cropper. The library and styles are bundled; no CDN is used. */
export type ImageKind = 'avatar' | 'background'
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export interface ImageEditorOptions { avatarScope?: 'conversation' | 'default' }

const copy = {
  zh: {
    avatar: '更换对话头像', background: '更换对话背景', choose: '选择图片',
    defaultAvatar: '设置默认头像', makeDefault: '同时设为默认头像', useDefault: '使用默认头像',
    penguin: '恢复企鹅头像', unavailable: '当前对话尚未就绪',
    empty: '点击选择图片', formats: 'PNG、JPEG、WebP · 最大 20 MB',
    zoom: '缩放图片', ratio: '裁剪比例', resetCrop: '重置取景',
    current: '当前对话比例', original: '原图比例', cancel: '取消', save: '裁剪并保存',
    reset: '恢复默认', invalid: '请选择不超过 20 MB 的 PNG、JPEG 或 WebP 图片。',
    error: '图片读取或保存失败，请重试。', saving: '正在保存…',
  },
  en: {
    avatar: 'Change chat avatar', background: 'Change chat background', choose: 'Choose image',
    defaultAvatar: 'Set default avatar', makeDefault: 'Also set as default avatar', useDefault: 'Use default avatar',
    penguin: 'Restore penguin avatar', unavailable: 'Conversation is not ready',
    empty: 'Click to choose an image', formats: 'PNG, JPEG, WebP · up to 20 MB',
    zoom: 'Image zoom', ratio: 'Crop ratio', resetCrop: 'Reset crop',
    current: 'Current conversation', original: 'Original image', cancel: 'Cancel', save: 'Crop and save',
    reset: 'Restore default', invalid: 'Choose a PNG, JPEG or WebP image up to 20 MB.',
    error: 'Could not read or save the image. Please try again.', saving: 'Saving…',
  },
}

export function imageCopy() {
  return copy[document.documentElement.lang.startsWith('zh') ? 'zh' : 'en']
}

export function openImageEditor(kind: ImageKind, save: (image: string, makeDefault?: boolean) => Promise<unknown>, options: ImageEditorOptions = {}): () => void {
  const t = imageCopy()
  const isConversation = kind === 'avatar' && options.avatarScope === 'conversation'
  const heading = kind === 'avatar' && options.avatarScope === 'default' ? t.defaultAvatar : t[kind]
  const previousFocus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.dataset.qqImageEditor = kind
  dialog.setAttribute('aria-label', heading)
  const styles = document.createElement('style')
  styles.textContent = cropperCss + `
    [data-qq-image-editor] {box-sizing:border-box;width:min(720px,94vw);max-height:92vh;
      border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:20px;padding:0;
      background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);font:14px/1.5 system-ui;overflow:hidden}
    [data-qq-image-editor][open] {display:flex;flex-direction:column}
    [data-qq-image-editor]::backdrop {background:rgba(8,15,26,.55);backdrop-filter:blur(3px)}
    [data-qq-image-editor] button {font:inherit;padding:8px 14px;border-radius:9px;cursor:pointer;
      border:1px solid var(--dsw-alias-border-l2,#ddd);background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:inherit}
    [data-qq-image-editor] button:disabled {opacity:.45;cursor:default}
    [data-qq-image-editor] button:focus-visible,[data-qq-image-editor] select:focus-visible {outline:2px solid var(--dsw-alias-brand-primary,#12b7f5);outline-offset:2px}
    [data-qq-image-editor] .qq-crop-stage {height:clamp(160px,38vh,360px);position:relative;overflow:hidden;border-radius:12px;
      background:#151b24;display:flex;align-items:center;justify-content:center;color:#b8c1ce;touch-action:none}
    [data-qq-image-editor] .qq-crop-stage>img {display:block;max-width:100%;max-height:100%}
    [data-qq-image-editor] .qq-crop-stage[data-empty] {cursor:pointer;border:1px dashed #4a5667;box-sizing:border-box}
    [data-qq-image-editor] .qq-crop-stage[data-empty]:hover {background:#1b2431;border-color:#12b7f5}
    [data-qq-image-editor] .qq-crop-stage:focus-visible {outline:2px solid #12b7f5;outline-offset:3px}
    [data-qq-image-editor] .cropper-modal {opacity:.68}
    [data-qq-image-editor] .cropper-view-box {outline:2px solid #12b7f5;outline-color:#12b7f5}
    [data-qq-image-editor] .cropper-line,[data-qq-image-editor] .cropper-point {background-color:#12b7f5}
    [data-qq-image-editor] .cropper-point {width:7px;height:7px;opacity:1}
    [data-qq-image-editor] .qq-crop-footer {display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 24px;border-top:1px solid var(--dsw-alias-border-l2,#ddd)}
    [data-qq-image-editor] .qq-crop-save {background:var(--dsw-alias-brand-primary,#12b7f5);color:#fff;border-color:transparent}
    [data-qq-image-editor] select {font:inherit;padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#ddd);background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:inherit}
  `
  const header = document.createElement('div')
  header.style.cssText = 'padding:20px 24px 12px;flex:none'
  const title = document.createElement('h2')
  title.textContent = heading
  title.style.cssText = 'margin:0;font-size:19px;font-weight:600'
  header.append(title)
  const body = document.createElement('div')
  body.style.cssText = 'padding:0 24px 12px;overflow:auto;min-height:0'
  const toolbar = document.createElement('div')
  toolbar.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 12px'
  const file = document.createElement('input')
  file.type = 'file'
  file.accept = 'image/png,image/jpeg,image/webp'
  file.hidden = true
  file.setAttribute('aria-label', t.choose)
  const fileName = document.createElement('span')
  fileName.textContent = t.formats
  fileName.style.cssText = 'font-size:12px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px'
  const stage = document.createElement('div')
  stage.className = 'qq-crop-stage'
  stage.tabIndex = 0
  stage.dataset.empty = ''
  stage.setAttribute('role', 'button')
  stage.setAttribute('aria-label', t.empty)
  stage.textContent = t.empty
  const controls = document.createElement('div')
  controls.style.cssText = 'display:flex;align-items:center;gap:16px;margin-top:14px;flex-wrap:wrap'
  const zoomLabel = document.createElement('label')
  zoomLabel.textContent = t.zoom
  zoomLabel.style.cssText = 'flex:1;min-width:140px;font-size:12px'
  const zoom = document.createElement('input')
  zoom.type = 'range'; zoom.min = '0.1'; zoom.max = '4'; zoom.step = '0.01'; zoom.value = '1'
  zoom.style.cssText = 'display:block;width:100%;accent-color:#12b7f5'
  zoom.disabled = true
  zoomLabel.append(zoom)
  const status = document.createElement('p')
  status.setAttribute('role', 'status')
  status.style.cssText = 'margin:6px 0 0;font-size:12px;color:var(--dsw-alias-label-caption,#707986)'
  const defaultChoice = document.createElement('label')
  defaultChoice.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:14px;cursor:pointer'
  const makeDefault = document.createElement('input')
  makeDefault.type = 'checkbox'
  makeDefault.style.accentColor = '#12b7f5'
  defaultChoice.append(makeDefault, document.createTextNode(t.makeDefault))
  const footer = document.createElement('div')
  footer.className = 'qq-crop-footer'
  let closed = false
  let busy = false
  let cropper: Cropper | undefined
  let objectUrl: string | undefined
  let generation = 0
  let imageRatio = 1
  let initialZoom = 1
  let outputType = 'image/webp'
  const viewport = document.querySelector('[data-conversation-scroll]')?.getBoundingClientRect()
  const viewportRatio = viewport?.width && viewport.height ? viewport.width / viewport.height : 16 / 9
  const aspect = document.createElement('select')
  const ratio = () => {
    if (kind === 'avatar') return 1
    if (aspect.value === 'original') return imageRatio
    if (aspect.value === 'current') return viewportRatio
    const [w, h] = aspect.value.split(':').map(Number)
    return w! / h!
  }
  const close = () => {
    if (closed) return
    closed = true
    generation++
    cropper?.destroy()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    dialog.close(); dialog.remove()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
  function button(parent: HTMLElement, label: string, action: () => void) {
    const el = document.createElement('button')
    el.type = 'button'; el.textContent = label; el.onclick = action
    parent.append(el)
    return el
  }
  const choose = button(toolbar, t.choose, () => file.click())
  toolbar.append(fileName, file)
  if (kind === 'background') {
    const label = document.createElement('label')
    label.textContent = t.ratio + ' '
    for (const [value, text] of [['current', t.current], ['16:9', '16:9'], ['4:3', '4:3'], ['9:16', '9:16'], ['original', t.original]]) {
      const option = document.createElement('option')
      option.value = value!; option.textContent = text!; aspect.append(option)
    }
    aspect.onchange = () => cropper?.setAspectRatio(ratio())
    label.append(aspect); toolbar.append(label)
  }
  const updateZoom = () => {
    if (cropper && !closed) {
      const canvas = cropper.getCanvasData()
      zoom.value = String(canvas.width / canvas.naturalWidth / initialZoom)
    }
  }
  zoom.oninput = () => { if (!busy) cropper?.zoomTo(Number(zoom.value) * initialZoom) }
  const resetCrop = button(controls, t.resetCrop, () => { cropper?.reset(); updateZoom() })
  resetCrop.disabled = true
  controls.prepend(zoomLabel)
  stage.onclick = () => { if (!cropper && !busy && !closed) file.click() }
  stage.onkeydown = event => {
    if (busy || closed || event.target !== stage) return
    if (!cropper) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); file.click() }
      return
    }
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const delta = arrows[event.key]
    if (delta) {
      event.preventDefault()
      const box = cropper.getCropBoxData()
      const step = event.shiftKey ? 10 : 1
      cropper.setCropBoxData({ left: box.left + delta[0] * step, top: box.top + delta[1] * step })
    } else if (['+', '=', '-', '−'].includes(event.key)) {
      event.preventDefault(); cropper.zoom(event.key === '-' || event.key === '−' ? -0.1 : 0.1)
    }
  }
  const commit = async (value: string, setDefault = false) => {
    if (busy || closed) return
    busy = true; status.textContent = t.saving; cropper?.disable()
    for (const el of dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select')) el.disabled = true
    try {
      if (await save(value, setDefault) === false) throw new Error('Save rejected')
      close()
    } catch { if (!closed) status.textContent = t.error }
    finally {
      busy = false
      if (!closed) {
        cropper?.enable()
        for (const el of dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select')) el.disabled = false
        submit.disabled = zoom.disabled = resetCrop.disabled = !cropper
      }
    }
  }
  const resetLabel = isConversation ? t.useDefault : kind === 'avatar' ? t.penguin : t.reset
  const restore = button(footer, resetLabel, () => { void commit('') })
  restore.style.marginRight = 'auto'
  button(footer, t.cancel, close)
  const submit = button(footer, t.save, () => {
    if (!cropper || busy) return
    try {
      const rect = cropper.getData(true)
      if (!(rect.width > 0 && rect.height > 0)) throw new Error('Empty crop')
      const limit = kind === 'avatar' ? 512 : 1600
      const scale = Math.min(1, limit / Math.max(rect.width, rect.height))
      const output = cropper.getCroppedCanvas({ width: Math.max(1, Math.round(rect.width * scale)), height: Math.max(1, Math.round(rect.height * scale)), maxWidth: limit, maxHeight: limit, fillColor: 'transparent', imageSmoothingEnabled: true, imageSmoothingQuality: 'high' })
      const data = output.toDataURL(outputType, 0.88)
      if (data.length > 3_000_000) throw new Error('Crop too large')
      void commit(data, isConversation && makeDefault.checked)
    } catch { status.textContent = t.error }
  })
  submit.className = 'qq-crop-save'
  submit.disabled = true
  const loadFile = (selected: File | undefined) => {
    if (!selected || busy || closed) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || selected.size > MAX_IMAGE_BYTES) {
      status.textContent = t.invalid; return
    }
    const ticket = ++generation
    cropper?.destroy(); cropper = undefined
    submit.disabled = zoom.disabled = resetCrop.disabled = true
    stage.textContent = t.empty
    stage.dataset.empty = ''
    stage.setAttribute('role', 'button')
    stage.setAttribute('aria-label', t.empty)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = undefined
    status.textContent = ''
    fileName.textContent = selected.name || t.formats
    const decoded = new Image()
    decoded.onload = () => {
      if (closed || ticket !== generation) return
      if (!decoded.naturalWidth || !decoded.naturalHeight || decoded.naturalWidth * decoded.naturalHeight > 100_000_000) {
        status.textContent = t.invalid; return
      }
      imageRatio = decoded.naturalWidth / decoded.naturalHeight
      outputType = selected.type === 'image/png' ? 'image/png' : 'image/webp'
      const source = document.createElement('img')
      source.alt = t[kind]; source.src = objectUrl!
      stage.replaceChildren(source)
      delete stage.dataset.empty
      stage.setAttribute('role', 'region')
      stage.setAttribute('aria-label', t[kind])
      try {
        cropper = new Cropper(source, {
          aspectRatio: ratio(), viewMode: 1, dragMode: 'move', autoCropArea: 0.75,
          background: true, modal: true, guides: true, center: true,
          cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false,
          rotatable: false, scalable: false,
          minContainerWidth: 100, minContainerHeight: 100,
          ready: () => { queueMicrotask(() => {
            if (closed || ticket !== generation || !cropper) return
            const canvas = cropper.getCanvasData()
            initialZoom = canvas.width / canvas.naturalWidth
            zoom.value = '1'
            submit.disabled = zoom.disabled = resetCrop.disabled = false
          }) },
          zoom: () => { queueMicrotask(updateZoom) },
        })
      } catch { cropper?.destroy(); cropper = undefined; status.textContent = t.error }
    }
    decoded.onerror = () => { if (!closed && ticket === generation) status.textContent = t.error }
    objectUrl = URL.createObjectURL(selected)
    decoded.src = objectUrl
  }
  file.onchange = () => { loadFile(file.files?.[0]); file.value = '' }
  // Ignore file drops, including the browser's default navigation to a file.
  dialog.addEventListener('dragover', event => event.preventDefault())
  dialog.addEventListener('drop', event => { event.preventDefault(); event.stopPropagation() })
  body.append(toolbar, stage, controls)
  if (isConversation) body.append(defaultChoice)
  body.append(status)
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy) close() })
  dialog.append(styles, header, body, footer)
  document.body.append(dialog)
  dialog.showModal(); choose.focus()
  return close
}
