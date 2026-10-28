/** Styles scoped to our React wrapper; native Markdown, reasoning and image DOM stay untouched. */
export const BUBBLE_CSS = `
[data-chat-segments-bubbles] { min-width: 0; position: relative; }
[data-chat-flow-kind='assistant-step']:has([data-repeat-avatars]) > button[data-qq-avatar] { visibility: hidden; }
[data-chat-flow-kind='assistant-step']:has([data-repeat-avatars])::before { display: none; }
[data-segment-avatar]:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #18b7f5); outline-offset: 3px; }
[data-chat-segments-bubbles] > div > div { gap: 12px; align-items: flex-start; }
[data-chat-segments-bubbles] > div > div > div:not([data-turn-process-inline]) {
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid var(--dsw-alias-border-l1, #e5e7eb);
  border-radius: 16px 16px 16px 6px;
  background: var(--dsw-alias-bg-layer-1, #fff);
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: no-preference) {
  [data-chat-segments-bubbles] > div > div > div:not([data-turn-process-inline]) {
    animation: dsh-segment-arrive 160ms ease-out;
  }
}
@keyframes dsh-segment-arrive { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
`
