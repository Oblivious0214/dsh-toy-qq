import { useLayoutEffect } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { Model } from './model.ts'
import { chatActivity, submissionActivity } from '../../../vendor/dialogue-timing/interruptions.js'

/** Observe actual submissions even while no assistant renderer is mounted. */
export function createInputObserver(model: Model) {
  return function InputObserver({ sessionId, useChat, useSession }: PropsRuntime<'conversation.input.left'>) {
    const chat = useChat(chatActivity), submissions = useSession(submissionActivity)
    useLayoutEffect(() => model.observeInput(sessionId, chat, submissions), [sessionId, chat, submissions])
    return null
  }
}
