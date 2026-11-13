# distortion-wave skill for AI agents

`distortion-wave/` teaches a coding agent to use this library well: which element to target, where the wave should start, how to make each framework render in time, which options matter, what the known bugs looked like, and how to check the result frame by frame.

It follows the Agent Skills format: a `SKILL.md` with a `name` and a `description` up top (the agent reads them to decide when to load the rest), short instructions, then reference files it opens only when needed.

```
distortion-wave/
├── SKILL.md                    when and how to use it, the rules that matter
├── references/
│   ├── api.md                  every option, default, tuning key and promise
│   ├── frameworks.md           React, Next.js, Vue, Svelte, Angular, Solid, Lit, htmx
│   ├── recipes.md              target / source for ~20 UI components, with code
│   ├── troubleshooting.md      symptom → cause → fix, and the bugs fixed per version
│   └── internals.md            how the library works, for changing or porting it
└── scripts/
    └── film-wave.mjs           films a wave frame by frame with a frozen clock (Playwright)
```

## Install

**Claude Code**: copy the folder into your project's `.claude/skills/` (or `~/.claude/skills/` for every project):

```sh
cp -r skill/distortion-wave .claude/skills/
```

**Claude apps**: zip the `distortion-wave` folder and upload it as a custom skill.

**Other agents**: if yours loads Agent Skills, put the folder where it looks for them. If it doesn't, point your rules file (`AGENTS.md`, `.cursor/rules`, `CLAUDE.md`, `.github/copilot-instructions.md`…) at it:

```md
When adding or debugging distortion-wave transitions, read skill/distortion-wave/SKILL.md first and follow it.
```

## Try it

Ask your agent something like:

- "Add a distortion wave when the user switches between Monthly and Yearly on the pricing card" (React)
- "The wave on my order steps shows a weird rectangle, fix it"
- "Make the theme switch wave the whole page, softer and faster"

To look at what it built: `node skill/distortion-wave/scripts/film-wave.mjs --url <page> --click <selector> --clip <selector>` writes the frames to `./wave-frames`.
