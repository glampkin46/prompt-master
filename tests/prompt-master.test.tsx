import { expect, test } from 'claude-code/testing'

test('/prompt-master <text> rewrites the given text', async ($, on) => {
  on('clock.now', () => ({ value: 0 }))
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'Better prompt', usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
  }))
  on('prompt.fill', () => ({ isFilled: true }))
  on('command.run', () => ({ text: 'engine' }))

  const r = await $.command.run({ command: 'prompt-master', args: 'fix bug pls' } as never)
  expect(r.text).toContain('Better prompt')
})

test('the button draws on desktop and mobile', async ($, on) => {
  on('clock.now', () => ({ value: 0 }))
  for (const surface of ['desktop', 'mobile', 'terminal'] as const) {
    const ui = await $.ui.mount({
      plugin: 'prompt-master',
      component: 'AbovePrompt',
      surface,
      props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 60, scroll: { offset: 0, bodyRows: 10 } },
    } as never)
    expect(await ui.find({ type: 'Button', key: 'prompt-master' })).toBeTruthy()
    await ui.unmount()
  }
})
