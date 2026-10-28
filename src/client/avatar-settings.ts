import { resolveQQSkinConfig, resolveImage, type QQSkinConfig } from './config.ts'
import type { AvatarBindings } from './settings.ts'

/** Empty image resets only the selected scope, never another conversation. */
export function nextAvatarBindings(config: QQSkinConfig, image: string, sessionId?: string, makeDefault = false): AvatarBindings {
  if (image && !resolveImage(image)) throw new Error('Invalid avatar image')
  if (sessionId !== undefined && (!sessionId || sessionId.length > 512 || sessionId === '__proto__')) {
    throw new Error('Invalid conversation')
  }
  const current = resolveQQSkinConfig(config)
  const conversations = { ...current.conversationAvatars }
  if (sessionId) {
    if (image) conversations[sessionId] = image
    else delete conversations[sessionId]
  }
  return {
    defaultImage: sessionId === undefined || (makeDefault && image) ? image : current.avatarImage,
    conversations,
  }
}
