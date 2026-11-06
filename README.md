# Pop Blocks

A little browser game for young kids. Tap colorful blocks, find treasures, and dodge the silly bombs.

The board is 8×8. Every block hides a star, gem, fruit, treat, or animal — or a cartoon bomb. Pop every safe block to win. Pop a bomb and that round starts over.

There are no accounts, ads, or network calls while you play. Sounds are made in the browser.

## Play locally

```bash
npm install
npm run dev
```

Open http://localhost:4177

## How to play

- Tap or click a block to break it.
- Treasures add points. ⭐ is this round. 🏆 is the best score for that bomb count, saved in this browser.
- 💣 is how many bombs are hidden.
- 🐣 4, 🐱 8, and 🐯 12 change how many bombs are in the board. 🐱 8 is the default.
- 🔊 turns the sound off and on.
- Clear every safe block and you win. A bomb shows “Boom! Try again!” and then deals a new board. The big Play again button skips the wait.

## Build a static site

```bash
npm run build
```

`dist/` is plain static files. Paths are relative (`./assets/...`), so the folder works on Netlify’s free plan and in a subfolder.

Netlify:

- Build command: `npm run build`
- Publish directory: `dist`

`netlify.toml` already sets those. You can also upload `dist/` by itself.

To check the build locally:

```bash
npm run preview
```

That serves the built site at http://localhost:4178

## Tests

```bash
npm test
```

Checks bomb counts, scoring, the win, and the boom restart rules.
