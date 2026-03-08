# Pronunciation App

A web app for practicing American English pronunciation, designed for non-native speakers from any language background. Built as a companion tool for an advanced pronunciation course.

**Live at [pronun.space](https://pronun.space)**

## What it does

Structured pronunciation lessons organized by topic (vowel sounds, consonant clusters, stress patterns, linking, etc.). Each lesson has three sections:

- **Theory** — Rules, IPA symbols, articulation tips, and example words with phonetic transcriptions. Tap any word to hear it.
- **Practice** — Interactive exercises: classify what sound highlighted letters make, or pick the correct linked version of a phrase.
- **Shadowing** — Listen to a phrase, record yourself repeating it, then compare side-by-side with waveform and pitch contour visualization. Stress and linking annotations show rhythm patterns.

### Other tools

- **Mouth Anatomy Diagram** — Interactive SVG showing articulation points (tongue, palate, teeth, etc.) for reference while learning sounds.
- **Free Shadowing** — Practice shadowing with any custom phrase outside of lessons.

## AI-generated content

Lesson content (theory, exercises, shadowing phrases) is generated dynamically by Claude via the Anthropic API using structured prompts. Each generation produces fresh material with accurate IPA transcriptions.

Content is cached locally and shared across users via a Supabase content pool, so not every visit requires an API call. Users can explicitly request fresh content when they want new practice material.

## Text-to-speech

Two-tier TTS with automatic fallback:

1. **ElevenLabs** — High-quality neural voice (primary)
2. **Browser SpeechSynthesis** — Zero-config fallback when ElevenLabs quota is exhausted. Prioritizes Microsoft Neural voices (Edge), then Apple Neural voices (Safari), then any available `en-US` voice.

## Shadowing visualization

Each shadowing phrase includes per-word stress and linking annotations:

| Visual | Meaning |
|--------|---------|
| Large + bold + filled dot | Primary stress |
| Medium + hollow dot | Secondary stress |
| Small + dimmed | Unstressed / reduced |
| Underline bridge between words | Phonetic linking |

Pitch contour overlays let you visually compare your intonation against the target.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Tailwind CSS, Motion |
| Build | Vite |
| AI | Anthropic API (Claude) |
| TTS | ElevenLabs, browser SpeechSynthesis fallback |
| Audio | WaveSurfer.js, FFmpeg WASM, Pitchfinder |
| Backend | Supabase (auth, content pool, progress tracking) |
| Hosting | Vercel |

## Project structure

```
src/
  App.jsx                      — Home screen + lesson routing
  data/lessons.js              — Lesson definitions (configs + AI prompts)
  services/
    api.js                     — Anthropic API client
    tts.js                     — Text-to-speech service
    cache.js                   — localStorage cache
    content.js                 — Content pool (Supabase)
  components/
    LessonView.jsx             — Lesson page (theory/practice/shadowing tabs)
    TheoryCard.jsx             — Collapsible theory section
    ShadowCard.jsx             — 3-step shadowing (listen/shadow/compare)
    PhraseAnnotation.jsx       — Stress + linking visual annotations
    PitchOverlay.jsx           — Pitch contour visualization
    SpeakWord.jsx              — Tap-to-hear word wrapper
    WordBadge.jsx              — Expandable word card (word + IPA + syllables)
    AnatomyDiagram.jsx         — Interactive mouth anatomy diagram
    FreeShadow.jsx             — Free-form shadowing practice
    MicBar.jsx                 — Microphone level indicator
    ThemeToggle.jsx            — Dark/light/system theme toggle
    AuthContext.jsx            — Google OAuth + progress state
    AdminPanel.jsx             — Content pool management
    ErrorBoundary.jsx          — React error boundary
```

## Setup

```bash
npm install
npm run dev
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Adding lessons

Add an entry to the `LESSON_DEFS` array in `src/data/lessons.js`:

```js
{
  id: "unique-id",
  title: "Lesson Title",
  subtitle: "short description",
  session: "Month DD, YYYY",
  exerciseType: "classify",        // or "rewrite"
  exerciseQuestion: "...",
  exerciseOptions: ["opt1", "opt2"],  // null for rewrite type
  prompt: `...`                    // AI prompt returning { theory, exercises, shadowing }
}
```

The prompt must instruct Claude to return JSON with `theory`, `exercises`, and `shadowing` keys. Shadowing items must include a `tokens` array with stress (`s`: 0/1/2) and linking (`lk`: boolean) data for the visualization to work.

## License

ISC
