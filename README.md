# Pronunciation Practice Lab

A React-based American English pronunciation training app built for ACC's Advanced American Pronunciation course. Designed for non-native speakers from any language background.

---

## Features

### Lessons
Each lesson covers a specific phonetic topic with three tabs:

- **Theory** — expandable cards per sound/rule. Tap any word to hear it pronounced.
- **Practice** — AI-generated exercises (classify sounds or pick the correct linked form). Tap any word or phrase to hear it. Randomized on every new generation.
- **Shadowing** — listen to a native speaker, record yourself, compare side by side.

**Current lessons (6 total):**

| Session | Lesson | Type |
|---------|--------|------|
| Feb 23, 2026 | Tricky Consonants `/tʃ/ /dʒ/ /ʃ/ /ʒ/ /θ/ /ð/ /ŋ/` | Classify |
| Feb 23, 2026 | Aspiration `/pʰ tʰ kʰ/` | Classify |
| Mar 4, 2026 | American /t/ (4 variants) | Classify |
| Mar 4, 2026 | Light & Dark L | Classify |
| Mar 4, 2026 | -S Endings `/s/ /z/ /əz/` | Classify |
| Mar 4, 2026 | Linking | Rewrite |

---

## AI Content Generation

All lesson content (theory, exercises, shadowing phrases) is **generated dynamically by Claude** (`claude-sonnet-4-6`) via the Anthropic API. Each lesson produces:

- Theory cards with IPA, articulation rules, and practical tips
- Exercises with accurate IPA transcriptions
- Shadowing phrases with stress and linking annotations

### Caching (token efficiency)
Content is cached in `localStorage` with key prefix `pron_v2_<lessonId>`. On lesson open, cached content loads instantly — **no API call is made**. The `↻ new` button explicitly clears the cache and forces a fresh generation. A `CACHED` label appears in the header when cached content is being shown.

---

## Text-to-Speech (TTS)

Two-tier system with automatic fallback:

### Primary — ElevenLabs
- Voice: **Rachel** (`21m00Tcm4TlvDq8ikWAM`), natural American English female
- Model: `eleven_turbo_v2`
- Settings: stability 0.4, similarity boost 0.75, style 0.3
- Free tier: 10,000 characters/month
- Once quota is hit, switches to fallback automatically — no user action needed

### Fallback — Web Speech API (browser-native)
Zero config, zero limits, zero account. Voice priority:

1. **Microsoft Neural voices** (Edge on Windows) — Jenny, Aria, Guy, etc. Same engine as edge-tts
2. **Microsoft standard** — Zira, David
3. **Apple Neural** — Samantha, Karen (Mac / iPhone / iPad)
4. Any available `en-US` voice

When the fallback is active, a note appears on each shadowing card showing the exact voice name being used (e.g., `⚠ browser TTS active · Microsoft Jenny Online (Natural)`).

> **Tip for best fallback quality:** Use Microsoft Edge. The neural voices injected by Edge are indistinguishable from edge-tts quality.

---

## Shadowing — Stress & Rhythm Visualization

Each shadowing phrase is annotated by the AI with per-word stress and linking data:

| Visual | Meaning |
|--------|---------|
| Larger + bold + filled dot `●` | Primary stress |
| Medium + hollow dot `○` | Secondary stress |
| Small + dimmed | Unstressed / reduced |
| Underline bridge between words | Phonetic linking (consonant → vowel) |

A legend is shown at the top of the Shadowing tab.

---

## Tap to Hear

Words and phrases are tappable anywhere they appear:

- **Theory** — tap any word in example cards
- **Practice** — tap the word (classify) or phrase (rewrite) before answering
- **Shadowing** — tap to play the full phrase (the main play button)

Visual indicator: dashed underline on tappable words. A small `▶` appears while playing. Tap again to stop.

---

## Dark / Light Mode

The app respects the system preference (`prefers-color-scheme`) by default. A toggle button (top-right corner) overrides it manually:

- `◉` — follows system
- `🌙` — force dark
- `☀️` — force light

---

## Design

- **Mobile-first** — all touch targets `min-height: 44px`, safe area insets for notched phones
- **Minimalist** — pure black/white, no color fills, system font, `border-radius: 3-4px`
- **Fully responsive** — works on mobile, tablet, and desktop
- No external UI libraries, no Google Fonts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React (hooks only) |
| Styling | CSS variables + inline styles, no Tailwind |
| AI content | Anthropic API (`claude-sonnet-4-6`) |
| TTS primary | ElevenLabs REST API |
| TTS fallback | Web Speech API (`window.speechSynthesis`) |
| Recording | MediaRecorder API |
| Storage | `localStorage` (content cache) |
| Fonts | System UI stack |

---

## Running

This is a single-file React artifact (`.jsx`). Load it in any environment that supports React + JSX — Claude.ai artifacts, CodeSandbox, or a local Vite/CRA project.

No build step, no `npm install`, no dependencies beyond React itself.

---

## Adding New Lessons

Add an entry to the `LESSON_DEFS` array with:

```js
{
  id: "unique-id",
  title: "Lesson Title",
  subtitle: "short description",
  icon: "emoji",
  color: "#hexcolor",           // accent color (used sparingly)
  session: "Month DD, YYYY",    // groups lessons on home screen
  exerciseType: "classify",     // or "rewrite"
  exerciseQuestion: "...",
  exerciseOptions: ["opt1", "opt2", "opt3"],  // null for rewrite
  prompt: `...`                 // full AI prompt — see existing lessons for format
}
```

The prompt must instruct the AI to return JSON with `theory`, `exercises`, and `shadowing` keys. Shadowing items must include a `tokens` array for the stress visualization to work.

---

## Credits

Developed by [Quauhtli Martínez](https://www.linkedin.com/in/quauhtlimtz) · 2026  
☕ Powered by a lot of coffee
