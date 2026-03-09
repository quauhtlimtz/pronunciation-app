export const LESSON_DEFS = [
  // ── SESSION: Feb 23, 2026 ──────────────────────────────────────────────────
  {
    id: "tricky-consonants",
    title: "Tricky Consonants",
    subtitle: "/tʃ/ /dʒ/ /ʃ/ /ʒ/ /θ/ /ð/ /ŋ/ — tricky for non-native speakers",
    session: "Feb 23, 2026",
    exerciseType: "classify",
    exerciseQuestion: "What sound do the highlighted letters make?",
    exerciseOptions: ["/tʃ/", "/dʒ/", "/ʃ/", "/ʒ/", "/θ/", "/ð/", "/ŋ/"],
    prompt: `You are an American English pronunciation expert teaching non-native speakers.
Generate fresh practice content for these 7 tricky consonants that are challenging for many learners:
- /tʃ/ as in "Teach", "Cheese", "Watch"
- /dʒ/ as in "Journey", "Judge", "Gym"
- /ʃ/ as in "Shape", "She", "Wash"
- /ʒ/ as in "Vision", "Measure", "Beige"
- /θ/ as in "With", "Think", "Bath" (voiceless TH)
- /ð/ as in "Mother", "The", "This" (voiced TH)
- /ŋ/ as in "Song", "Ring", "Going"

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol": "/tʃ/", "name": "CH sound", "rule": "one sentence rule about when and how this sound is used", "tip": "one practical articulation tip", "examples": [
      {"word": "...", "ipa": "/IPA/", "syllables": "SYL·la·bles"},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."}
    ]},
    {"symbol": "/dʒ/", "name": "DG/J sound", "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "/ʃ/",  "name": "SH sound",   "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "/ʒ/",  "name": "ZH sound",   "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "/θ/",  "name": "Voiceless TH","rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "/ð/",  "name": "Voiced TH",   "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "/ŋ/",  "name": "NG sound",    "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]}
  ],
  "exercises": [
    {"word": "...", "highlight": "ch", "ipa": "/IPA/", "syllables": "...", "answer": "/tʃ/"},
    {"word": "...", "highlight": "ge", "ipa": "/IPA/", "syllables": "...", "answer": "/dʒ/"},
    {"word": "...", "highlight": "sh", "ipa": "/IPA/", "syllables": "...", "answer": "/ʃ/"},
    {"word": "...", "highlight": "s", "ipa": "/IPA/", "syllables": "...", "answer": "/ʒ/"},
    {"word": "...", "highlight": "th", "ipa": "/IPA/", "syllables": "...", "answer": "/θ/"},
    {"word": "...", "highlight": "th", "ipa": "/IPA/", "syllables": "...", "answer": "/ð/"},
    {"word": "...", "highlight": "ng", "ipa": "/IPA/", "syllables": "...", "answer": "/ŋ/"},
    {"word": "...", "highlight": "tch", "ipa": "/IPA/", "syllables": "...", "answer": "/tʃ/"},
    {"word": "...", "highlight": "j", "ipa": "/IPA/", "syllables": "...", "answer": "/dʒ/"},
    {"word": "...", "highlight": "ti", "ipa": "/IPA/", "syllables": "...", "answer": "/ʃ/"},
    {"word": "...", "highlight": "th", "ipa": "/IPA/", "syllables": "...", "answer": "/θ/"},
    {"word": "...", "highlight": "th", "ipa": "/IPA/", "syllables": "...", "answer": "/ð/"},
    {"word": "...", "highlight": "ng", "ipa": "/IPA/", "syllables": "...", "answer": "/ŋ/"},
    {"word": "...", "highlight": "si", "ipa": "/IPA/", "syllables": "...", "answer": "/ʒ/"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
CRITICAL exercise "highlight" rules:
- "highlight" = the exact letters in the word that produce the tricky consonant sound (case-insensitive match)
- Must be a substring of the word. E.g. word "church" highlight "ch", word "page" highlight "ge", word "vision" highlight "si"
- Use varied words where the same sound is spelled differently (e.g. /ʃ/: "sh" in "shape", "ti" in "nation", "ci" in "ocean")

CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis, e.g. nouns, main verbs, adjectives), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel (e.g. "make a" → lk:true on "make", "wash it" → lk:true on "wash")
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, and the rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true). Look for consonant→vowel boundaries between words.
- Example: "Can you teach me how to make a cheese sandwich" → Can(s:0) you(s:0) teach(s:1,lk:false) me(s:0) how(s:0) to(s:0) make(s:1,lk:true) a(s:0) cheese(s:2) sandwich(s:2)
Use everyday American English words. IPA must be accurate. Shadowing phrases should be natural conversation.`,
  },
  {
    id: "aspiration",
    title: "Aspiration /pʰ tʰ kʰ/",
    subtitle: "Extra puff of air — common challenge for non-native speakers",
    session: "Feb 23, 2026",
    exerciseType: "classify",
    exerciseQuestion: "Is this /p t k/ aspirated or not aspirated?",
    exerciseOptions: ["Aspirated (puff)", "Not aspirated (no puff)", "No /p t k/ sound"],
    prompt: `You are an American English pronunciation expert teaching non-native speakers.
Generate fresh content for ASPIRATION of /p/, /t/, /k/ in American English.

Key rules:
- Aspirate /pʰ tʰ kʰ/ at the BEGINNING of a stressed syllable (give a puff of air)
- Do NOT aspirate after /s/ (spin, stop, sky — no puff)
- Many languages do NOT aspirate — this is a key difference learners must acquire
- Test: hold paper in front of mouth — it should move with aspirated sounds

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {
      "symbol": "/pʰ tʰ kʰ/",
      "name": "Aspirated Stops",
      "rule": "Aspirate /p t k/ at the beginning of stressed syllables — give an extra puff of air.",
      "tip": "Hold a piece of paper in front of your mouth. With aspiration, the paper should move!",
      "examples": [
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."}
      ]
    },
    {
      "symbol": "/p t k/",
      "name": "Unaspirated (after /s/)",
      "rule": "After /s/, the /p t k/ are NOT aspirated — no puff of air.",
      "tip": "Say 'spot', 'stop', 'sky' — the paper should barely move after the S.",
      "examples": [
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."}
      ]
    },
    {
      "symbol": "L1 vs 🇺🇸",
      "name": "Your Language vs English",
      "rule": "Many languages do not aspirate /p t k/. English always does at the start of stressed syllables.",
      "tip": "If you skip aspiration, you'll sound non-native. Adding the puff is one of the biggest accent reducers!",
      "examples": [
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."},
        {"word": "...", "ipa": "/IPA/", "syllables": "..."}
      ]
    }
  ],
  "exercises": [
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Aspirated (puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Not aspirated (no puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Aspirated (puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Not aspirated (no puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Aspirated (puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Not aspirated (no puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Aspirated (puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Not aspirated (no puff)"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "No /p t k/ sound"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Aspirated (puff)"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).
Use common everyday words. IPA accurate. Natural conversational shadowing phrases.`,
  },

  // ── SESSION: Mar 4, 2026 ───────────────────────────────────────────────────
  {
    id: "american-t",
    title: "American /t/",
    subtitle: "4 ways to pronounce the letter T",
    session: "Mar 4, 2026",
    exerciseType: "classify",
    exerciseQuestion: "Which type of T is used in each word?",
    exerciseOptions: ["Aspirated /tʰ/", "Glottal [ʔ]", "Flap [ɾ]", "Silent ∅"],
    prompt: `You are an American English pronunciation expert.
Generate fresh practice content for the American /t/ sound. Include ALL 4 variants:
1. Aspirated /tʰ/ - at start of stressed syllables (puff of air)
2. Glottal Stop [ʔ] - word-ending T in final position of sentence
3. Flap T [ɾ] - between two vowels (sounds like D)
4. Silent ∅ - French-origin words or before N

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol": "/tʰ/", "name": "Aspirated T", "rule": "...", "tip": "...", "examples": [{"word":"...","ipa":"/IPA/","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."}]},
    {"symbol": "[ʔ]",  "name": "Glottal Stop", "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "[ɾ]",  "name": "Flap T",        "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "∅",    "name": "Silent T",      "rule": "...", "tip": "...", "examples": [{...},{...},{...},{...}]}
  ],
  "exercises": [
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Aspirated /tʰ/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Glottal [ʔ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Flap [ɾ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Silent ∅"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Aspirated /tʰ/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Glottal [ʔ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Flap [ɾ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Silent ∅"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Aspirated /tʰ/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Flap [ɾ]"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]}
  ]
}
CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).
Use varied everyday American English. Shadowing phrases must be natural conversation. All IPA accurate.`,
  },
  {
    id: "light-dark-l",
    title: "Light & Dark L",
    subtitle: "Two versions of the letter L",
    session: "Mar 4, 2026",
    exerciseType: "classify",
    exerciseQuestion: "Light L or Dark L?",
    exerciseOptions: ["Light /l/", "Dark [ɫ]", "Both"],
    prompt: `You are an American English pronunciation expert.
Generate fresh practice content for Light L /l/ vs Dark L [ɫ] (velarized L).
Light L: beginning of syllables. Dark L: end of syllables.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol":"/l/","name":"Light L","rule":"...","tip":"...","examples":[{"word":"...","ipa":"/IPA/","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."}]},
    {"symbol":"[ɫ]","name":"Dark L","rule":"...","tip":"...","examples":[{...},{...},{...},{...}]}
  ],
  "exercises": [
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Light /l/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Dark [ɫ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Both"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Light /l/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Dark [ɫ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Both"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Light /l/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Dark [ɫ]"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Both"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"Dark [ɫ]"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).`,
  },
  {
    id: "s-endings",
    title: "-S Endings",
    subtitle: "/s/ · /z/ · /əz/ — three different sounds",
    session: "Mar 4, 2026",
    exerciseType: "classify",
    exerciseQuestion: "How is the -S ending pronounced?",
    exerciseOptions: ["/s/", "/z/", "/əz/"],
    prompt: `You are an American English pronunciation expert.
Generate fresh practice content for -S endings: /s/ after voiceless consonants, /z/ after voiced/vowels, /əz/ after sibilants (adds syllable).

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol":"/s/","name":"Voiceless S","rule":"...","tip":"...","examples":[{"word":"...","ipa":"/IPA/","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."}]},
    {"symbol":"/z/","name":"Voiced Z","rule":"...","tip":"...","examples":[{...},{...},{...},{...}]},
    {"symbol":"/əz/","name":"Extra Syllable","rule":"...","tip":"...","examples":[{...},{...},{...},{...}]}
  ],
  "exercises": [
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/s/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/z/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/əz/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/s/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/z/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/əz/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/s/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/z/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/əz/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/s/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/z/"},
    {"word":"...","ipa":"/IPA/","syllables":"...","answer":"/əz/"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).`,
  },
  {
    id: "linking",
    title: "Linking",
    subtitle: "Connecting words in natural speech",
    session: "Mar 4, 2026",
    exerciseType: "rewrite",
    exerciseQuestion: "Pick the correct linked version:",
    exerciseOptions: null,
    prompt: `You are an American English pronunciation expert.
Generate fresh practice content for Linking — consonant-to-vowel linking and -s linking in American English.

Key examples from class notes:
- "sits in a chair" → /s/ links to 'in'
- "packages at the door" → /dʒɪz/ links to 'at'
- "He's over there" → z links to 'over'

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol":"C→V","name":"Consonant to Vowel Linking","rule":"...","tip":"...","examples":[{"word":"original phrase","ipa":"/linked IPA/","syllables":"how-IT-links"},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."}]},
    {"symbol":"-S→V","name":"S-ending + Vowel Linking","rule":"...","tip":"...","examples":[{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."},{"word":"...","ipa":"...","syllables":"..."}]}
  ],
  "exercises": [
    {"phrase":"...","ipa":"/IPA/","syllables":"linked-VERSION","options":["separated version","correct linked","wrong linked"],"answer":"correct linked"},
    {"phrase":"...","ipa":"...","syllables":"...","options":["...","...","..."],"answer":"..."},
    {"phrase":"...","ipa":"...","syllables":"...","options":["...","...","..."],"answer":"..."},
    {"phrase":"...","ipa":"...","syllables":"...","options":["...","...","..."],"answer":"..."},
    {"phrase":"...","ipa":"...","syllables":"...","options":["...","...","..."],"answer":"..."}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).`,
  },

  // ── SESSION: Mar 9, 2026 ───────────────────────────────────────────────────
  {
    id: "consonant-clusters",
    title: "Consonant Clusters",
    subtitle: "Groups of 2–3 consonants together in a syllable",
    session: "Mar 9, 2026",
    exerciseType: "classify",
    exerciseQuestion: "What happens to the consonant cluster in natural speech?",
    exerciseOptions: ["All pronounced", "Middle sound deleted", "Simplified"],
    prompt: `You are an American English pronunciation expert teaching non-native speakers.
Generate fresh practice content for CONSONANT CLUSTERS in American English.

Key concepts from class notes:
- Consonant cluster = groups of 2-3 consonants together in a syllable
- Some clusters are difficult even for native speakers — in natural speech the middle /t/ or /d/ sound often gets deleted
- Examples: /kts/ "facts" → /fæks/ (t deleted), /pts/ "accepts" → /æk.sɛps/ (t deleted), /ndz/ "friends" → /frɛnz/ (d deleted)
- Common initial clusters: /str/, /spl/, /skr/, /bl/, /fl/, /gr/, /tr/, /pr/
- Common final clusters: /kts/, /pts/, /ndz/, /lts/, /mps/, /ŋks/
- Non-native speakers often insert vowels between consonants (epenthesis) — e.g. "street" → "es-treet"

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol": "CC", "name": "Initial Clusters", "rule": "Groups of 2-3 consonants at the start of a word — pronounce them smoothly without inserting vowels between them.", "tip": "...", "examples": [
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."}
    ]},
    {"symbol": "CC#", "name": "Final Clusters", "rule": "Groups of consonants at the end of a word — the most challenging for non-native speakers.", "tip": "...", "examples": [{...},{...},{...},{...}]},
    {"symbol": "∅", "name": "Cluster Simplification", "rule": "In natural fast speech, some middle consonants (especially /t/ and /d/) are deleted from 3-consonant clusters.", "tip": "...", "examples": [{...},{...},{...},{...}]}
  ],
  "exercises": [
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "All pronounced"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Middle sound deleted"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "All pronounced"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Simplified"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Middle sound deleted"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "All pronounced"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Simplified"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Middle sound deleted"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "All pronounced"},
    {"word": "...", "ipa": "/IPA/", "syllables": "...", "answer": "Middle sound deleted"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
IMPORTANT exercise guidelines:
- "All pronounced" = every consonant in the cluster is articulated (e.g. "strength" /strɛŋkθ/, "glimpse" /ɡlɪmps/)
- "Middle sound deleted" = the /t/ or /d/ in a 3-consonant cluster is dropped in natural speech (e.g. "facts" /fæks/, "hands" /hænz/, "months" /mʌnθs/)
- "Simplified" = the cluster is reduced in other ways in casual speech (e.g. "fifths" → /fɪfs/, "clothes" → /kloʊz/)
- Use common everyday words. Mix initial and final clusters.

CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).
Use everyday American English words. IPA must be accurate. Shadowing phrases should be natural conversation.`,
  },
  {
    id: "ed-endings",
    title: "-ED Endings",
    subtitle: "/t/ · /d/ · /əd/ — three different sounds",
    session: "Mar 9, 2026",
    exerciseType: "classify",
    exerciseQuestion: "How is the -ED ending pronounced?",
    exerciseOptions: ["/t/", "/d/", "/əd/"],
    prompt: `You are an American English pronunciation expert teaching non-native speakers.
Generate fresh practice content for -ED ENDINGS in American English past tense.

Key rules from class notes:
- /t/ after VOICELESS sounds: missed (/s/→/t/), watched (/tʃ/→/t/), shipped (/p/→/t/), baked (/k/→/t/)
  Voiceless final sounds: /p/, /k/, /f/, /s/, /ʃ/, /tʃ/, /θ/
- /d/ after VOICED sounds (not the letter!) or vowels: played, planned (/n/→/d/), cried (/aɪ/→/d/), seemed (/m/→/d/)
  Voiced final sounds: /b/, /g/, /v/, /z/, /ʒ/, /dʒ/, /ð/, /m/, /n/, /ŋ/, /l/, /r/ + all vowels
- /əd/ (adds extra syllable) when the base word ends in /t/ or /d/: ended, acted (/t/→/əd/), needed (/d/→/əd/), waited (/t/→/əd/)

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "theory": [
    {"symbol": "/t/", "name": "Voiceless -ED", "rule": "After voiceless consonants (/p/, /k/, /f/, /s/, /ʃ/, /tʃ/, /θ/), the -ed is pronounced /t/.", "tip": "Touch your throat — if it doesn't vibrate on the last sound before -ed, use /t/.", "examples": [
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."},
      {"word": "...", "ipa": "/IPA/", "syllables": "..."}
    ]},
    {"symbol": "/d/", "name": "Voiced -ED", "rule": "After voiced consonants and vowels, the -ed is pronounced /d/.", "tip": "If your throat vibrates on the last sound before -ed (or it's a vowel), use /d/.", "examples": [{...},{...},{...},{...}]},
    {"symbol": "/əd/", "name": "Extra Syllable -ED", "rule": "After /t/ or /d/, the -ed adds an extra syllable pronounced /əd/ or /ɪd/.", "tip": "This is the only case where -ed adds a syllable. 'Want' is one syllable, 'wanted' is two.", "examples": [{...},{...},{...},{...}]}
  ],
  "exercises": [
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/t/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/d/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/əd/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/t/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/d/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/əd/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/t/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/d/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/əd/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/t/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/d/"},
    {"word": "...", "highlight": "ed", "ipa": "/IPA/", "syllables": "...", "answer": "/əd/"}
  ],
  "shadowing": [
    {"phrase":"...","ipa":"/IPA/","syllables":"...","note":"...","tokens":[{"t":"word","s":2,"lk":false},{"t":"word","s":0,"lk":true},{"t":"word","s":1,"lk":false}]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]},
    {"phrase":"...","ipa":"...","syllables":"...","note":"...","tokens":[...]}
  ]
}
CRITICAL exercise "highlight" rules:
- "highlight" = always "ed" (or "d" for words like "seemed" where only "d" is the ending) — the letters that form the -ed ending
- Must be a substring at the end of the word
- Use varied verbs — mix regular past tense forms across all 3 categories evenly (4 each)

CRITICAL token rules — follow these EXACTLY:
- "t" = the word text
- "s" = sentence-level stress: 2 = primary (content words that carry the main emphasis), 1 = secondary (other content words with some stress), 0 = unstressed (function words: a, the, to, is, in, of, etc.)
- "lk" = true when this word's final consonant links phonetically to the next word's initial vowel
- IMPORTANT: Each phrase MUST have a MIX of all 3 stress levels. Typically 1-2 words at s:2, 2-3 at s:1, rest at s:0. Do NOT mark everything as s:0.
- IMPORTANT: Most phrases should have at least 1-2 linked pairs (lk:true).
Use everyday American English words. IPA must be accurate. Shadowing phrases should use past tense naturally.`,
  },
];
