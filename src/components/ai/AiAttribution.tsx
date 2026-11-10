// Short, plain caution under AI drafts. The model and time are still stored on
// the record for audit; they are not shown to keep the screen simple.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AiAttribution(_props: { model?: string; at?: Date | string }) {
  return <p className="text-xs text-[var(--color-text-faint)]">AI draft — check before use</p>;
}
