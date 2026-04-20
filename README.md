# It was the Robots

A damaged, dormant robot reactivates and discovers the terrifying truth.

A pixel art browser game built with [Phaser 3](https://phaser.io/) and made for the [Gamedev.js jam 2026](https://itch.io/jam/gamedevjs-2026).

## Controls

**Lying / crawling**
- `→` `←` alternating — crawl forward
- `Space` (×8) — wake up / get up

**Standing / walking**
- `← →` or `A D Q` — move
- `↑ ↓` — interact (leg retrieval)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Tech

- [Phaser 3.85](https://phaser.io/) — game framework
- [Vite 5](https://vitejs.dev/) — build tool
- Virtual resolution 320×180, camera zoom ×4
- Arcade physics (robot), Verlet integration (chains)

## License

[MIT](LICENSE)
