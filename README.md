# Prompt Master

A Claude Code mod that rewrites a rough prompt into a clearer, more specific one before you send it. It keeps your intent, names, file paths and code, and adds structure: the goal first, then context, constraints and what "done" looks like.

## Use

- `/prompt-master <your rough prompt>` rewrites the text and shows the result. Where Claude Code can reach your prompt box, it also puts the rewrite there for you to review and send.
- `/prompt-master` with nothing after it rewrites the draft already in the prompt box.
- Where your app draws the row above the prompt box (the terminal, for example), a **✨ Prompt Master** button does the same in one click, and **Undo** restores your original draft until you send.

Each rewrite is one extra tool-less model call (Sonnet, low effort) and counts toward your session's usage.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-master --marketplace glampkin46/prompt-master
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```bash
claude plugin install prompt-master --marketplace glampkin46/prompt-master
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `glampkin46/prompt-master`, then **Add plugin**.

## License

MIT
