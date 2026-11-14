import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { PromptMasterStatus } from '../types'

const status = atom(
  { plugin: 'prompt-master', key: 'status' } as const,
  'idle' as PromptMasterStatus,
)
// The draft as it was before the last rewrite, so one press can undo it.
const original = atom(
  { plugin: 'prompt-master', key: 'original' } as const,
  null as string | null,
)

const SYSTEM = `You are Prompt Master, an expert prompt engineer.
Rewrite the user's rough prompt for an AI coding/assistant agent so it is clear, specific and actionable.
- Keep the user's intent, facts, names, file paths and code exactly; never invent requirements.
- State the goal first, then relevant context, constraints and the expected output or "done" criteria.
- Fix spelling and grammar, remove ambiguity and filler. Use short bullets only when they help.
- Keep it proportionate: a one-line ask stays short.
- Write in the user's voice (first person, as the request they will send).
Reply with ONLY the rewritten prompt: no preamble, no quotes, no commentary.`

// Diagnostics go to the debug log (`claude --debug`), never to a file.
async function log($: EngineInterface, msg: string): Promise<void> {
  try {
    $.ui.log(`prompt-master: ${msg}`)
  } catch {
    // logging must never break the mod
  }
}

async function rewrite($: EngineInterface, given = ''): Promise<string> {
  if ((await read($, status)) === 'working') return 'Prompt Master is already working.'
  const box = given.trim() ? { text: given, cursor: 0 } : await $.prompt.read()
  const text = box.text
  const draft = text.trim()
  await log($, `rewrite: source=${given.trim() ? 'args' : 'prompt box'} chars=${draft.length}`)
  if (!draft) {
    return 'Nothing to rewrite. Type `/prompt-master <your rough prompt>`, or put a draft in the prompt box first.'
  }

  await update($, status, () => 'working')
  $.ui.status('✨ Prompt Master rewriting…')
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: SYSTEM,
      prompt: `Rough prompt to rewrite:\n<rough_prompt>\n${draft}\n</rough_prompt>`,
      maxTokens: 2048,
      effort: 'low',
    })
    if (!r.isAnswered || !r.text.trim()) {
      const why = r.isAnswered ? 'empty reply' : JSON.stringify(r)
      await log($, `model failed: ${why}`)
      $.ui.toast(`Prompt Master failed: ${why}`)
      return `Prompt Master failed: ${why}`
    }
    const better = r.text.trim()
    const filled = await $.prompt.fill({ text: better, mode: 'replace' })
    await log($, `fill: ${JSON.stringify(filled)}`)
    if (!filled.isFilled) {
      return `✨ Rewritten prompt (copy it into the box):\n\n${better}`
    }
    await update($, original, () => text)
    $.ui.toast('✨ Prompt rewritten. Review it, then send.')
    return `✨ Rewritten prompt (now in your prompt box):\n\n${better}`
  } catch (err) {
    await log($, `error: ${String(err)}`)
    return `Prompt Master failed: ${String(err)}`
  } finally {
    await update($, status, () => 'idle')
    $.ui.status(undefined)
  }
}

const seen = new Set<string>()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await log($, 'session.start: mod loaded')
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite a rough prompt into a better one: /prompt-master <rough prompt>',
    })

    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async ($, e) => ({
    text: await rewrite($, e.args),
  }))

  on('session.attach', async ($, e, next) => {
    await log($, `client attached: surface=${e.surface} id=${e.clientId}`)
    return next(e)
  })

  // Forget the undo copy once the prompt is sent.
  on('prompt.submit', async ($, e, next) => {
    void update($, original, () => null).catch(() => {})
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!seen.has(e.surface)) {
      seen.add(e.surface)
      await log($, `AbovePrompt drawn on surface=${e.surface}`)
    }
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const isWorking = (await read($, status)) === 'working'
    const prior = await read($, original)
    const below = await next(e)

    return (
      <Box flexDirection="column">
        {below}
        <Box>
          {isWorking ? (
            <Text dimColor>✨ Prompt Master is rewriting your draft…</Text>
          ) : (
            <Button
              key="prompt-master"
              label="✨ Prompt Master"
              hotkey="p"
              onPress={() => void rewrite($)}
            />
          )}
          {prior !== null && !isWorking ? (
            <Button
              key="prompt-master-undo"
              label="Undo"
              onPress={async () => {
                await $.prompt.fill({ text: prior, mode: 'replace' })
                await update($, original, () => null)
              }}
            />
          ) : null}
        </Box>
      </Box>
    )
  })
}
