/**
 * ========================================================
 *  MEDIA REGISTRY — Centralized GIF & Image Library
 *  كل الـ GIFs والصور التفاعلية للألعاب والـ RPG
 * ========================================================
 */

// ─── GAME GIFS ───────────────────────────────────────────
const GAME_MEDIA = {

  // 🎰 SLOTS
  slots: {
    spin:    'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXE4dHJieTB0bHZyaHYxeHIzbHd4ZWZhNHc3b2x6aWU0cmIyZHdmbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI6hkM8YEdxFT44/giphy.gif',
    win:     'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    jackpot: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif',
    lose:    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    bg:      'https://i.postimg.cc/GmdGJLFC/slots-bg.gif'
  },

  // 🎡 ROULETTE
  roulette: {
    spin:  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExanZlYmYzb3hsMDB3dHU2dXpmZGhmd2t0eW1wNXRjajV4c3VkcGpudyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKu5aIDY9xols5i/giphy.gif',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    table: 'https://i.imgur.com/WGnHPgt.png'
  },

  // 🃏 BLACKJACK
  blackjack: {
    deal:  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWczYmlsandlbGlxajBzcHVrcXAxMzc4Ynhsc3o5NXo4dHN4aTl3YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/UqZ4imFIoljlr5O2sM/giphy.gif',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    bust:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    table: 'https://i.imgur.com/sBkmFkE.png'
  },

  // 🪨 RPS
  rps: {
    play:  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTRhNnkxanl4d3hkZ2Jhb255NGdtazVtaWZyMzg5aTQxenVvNGJhNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI1erPMTMBFmNHi/giphy.gif',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    tie:   'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHN3ZHAzcXlxdGc5dHB3anVtb2kxazRhM3BreGZyYXR4c3N1OWV0YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohzdYJK1wAdPWVk88/giphy.gif',
    rock:  'https://i.imgur.com/xkRaWdl.png',
    paper: 'https://i.imgur.com/3Mb4gGC.png',
    scissors: 'https://i.imgur.com/p5MrB5l.png'
  },

  // 🏇 RACE
  race: {
    start: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWU5M3FldXF0NHlodGJvemV4bGY1eTQ1MnJ4b2VmZ2Qzd3kwOWU2dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRuo6sLetdllPAQ/giphy.gif',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    running: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXBxZGc2NTZ4N3ZuaWo5NzgxMWIxNmxobThzeGVib29zdnlncXg5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT1XGzAnABSXy8DPCU/giphy.gif'
  },

  // 🎣 FISHING
  fish: {
    cast:    'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzBseHkxaWtmenV2ZGphYm1qazJqajE3cXh4OXR1d3RkNm5mZGlheSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI5VtyvAbQA3LkA/giphy.gif',
    catch:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    miss:    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    legendary: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif',
    ocean:   'https://i.imgur.com/TH3mLBR.gif'
  },

  // 🪙 COINFLIP
  coinflip: {
    flip:  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXB3aHVyMm9qY255aHl4czZwdXZvdTZnNGV1NDl3aXNubjFlN2JvNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjHZhG9COPG3S5ig/giphy.gif',
    heads: 'https://i.imgur.com/7mEo7tA.png',
    tails: 'https://i.imgur.com/UbUgV1a.png',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif'
  },

  // 🎲 DICE / GUESS
  dice: {
    roll:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGh2bmxib3Q5MWJ6OGZmaHcwbmd3eHpxeGVwcGlkMHFqZmk2ajI5MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7LLHlDZlxnXD1zQWPZ/giphy.gif',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif'
  },

  // 🃏 CARDS
  cards: {
    deal:  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWczYmlsandlbGlxajBzcHVrcXAxMzc4Ynhsc3o5NXo4dHN4aTl3YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/UqZ4imFIoljlr5O2sM/giphy.gif',
    win:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif'
  },

  // 📈 STOCKS
  stocks: {
    up:    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWJsOHBmZjRmYzFka2x4bnJ4azhkdnF3NTZtZzFranpxMWc3aHlseCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l46Cy1rHbQ92uuLXa/giphy.gif',
    down:  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeW53ZWs5azNsajU2b3A4Y2Uxbjl2bmtzbGF4c2Y1MDNxZGJodGJtdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT9IgG50Lg7rusRgXu/giphy.gif',
    chart: 'https://i.imgur.com/ky9CXGT.gif'
  },

  // 💼 WORK
  work: {
    warrior:  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjAzZXRidHQycXc0N3pkb282NGtiMndtODBhdmtlenByc3htenZtciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4FGt6g4KDGVB4OhW/giphy.gif',
    miner:    'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzY0eTFudHZ3bXlucXhnb2RjNmJqOWM4MHQwZDI3cHNlOWVtYzdjeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IG6UnfQjFcFXEBzGGg/giphy.gif',
    farmer:   'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif',
    trader:   'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWtzYzVnenFmbGlvbjk4dWFyY2ZjNzFsdng3eGdnNm9wNjZ3OXVtYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPEqDGUULpEU0aQ/giphy.gif',
    hunter:   'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWU5M3FldXF0NHlodGJvemV4bGY1eTQ1MnJ4b2VmZ2Qzd3kwOWU2dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRuo6sLetdllPAQ/giphy.gif',
    general:  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmJrYmgxMHhvaGFqN3p5aXJ3d3ZpMzdvcmFhMG9odGo3OHhqbGpuMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKAe6Xt9RIjsGIE/giphy.gif'
  },

  // 🎁 DAILY
  daily: {
    streak_low:  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmJrYmgxMHhvaGFqN3p5aXJ3d3ZpMzdvcmFhMG9odGo3OHhqbGpuMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKAe6Xt9RIjsGIE/giphy.gif',
    streak_mid:  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif',
    streak_high: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif',
    gift:        'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzY0eTFudHZ3bXlucXhnb2RjNmJqOWM4MHQwZDI3cHNlOWVtYzdjeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IG6UnfQjFcFXEBzGGg/giphy.gif'
  },

  // 🎉 GENERAL
  general: {
    win:      'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    lose:     'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    celebrate:'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif',
    levelup:  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGx4anB0ZjYzaHpuNW1vdmJ3bWhvaGt4MXVtZmZ1MzEydWZ6ZGowbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lp5K5ypNRhPmLRmX91/giphy.gif',
    loading:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWpzY2huMW9pZXZraWt5czh0dXh3a2FpenZtY3VoaGhwNWN6YXJpYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI6hkM8YEdxFT44/giphy.gif'
  }
};

// ─── FARM GIFS ────────────────────────────────────────────
const FARM_MEDIA = {
  // Weather backgrounds
  weather: {
    sunny:   'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmJrYmgxMHhvaGFqN3p5aXJ3d3ZpMzdvcmFhMG9odGo3OHhqbGpuMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKAe6Xt9RIjsGIE/giphy.gif',
    rainy:   'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmpnaTJpZW54eTBxaWxzY2N1YTFvNjZmdHU4c3I4N2tyMWlzMHF6cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26n6xBpxNXExDfuKc/giphy.gif',
    storm:   'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExanZrZ3dtMXF5bXg3ZTlxYm95dDJxdDRxaTk3d3YwcWZ5OHFidGYxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt8tD3m0U3xNJEY/giphy.gif',
    golden:  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    frozen:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3lkMjlxemdkNHU5azZqdWRkZnlqdzJ2ajBqYWE1MWhnMG0xcXZoMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/KffdTQfewxHjfCpFbW/giphy.gif',
    harvest: 'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif'
  },
  // Actions
  actions: {
    plant:   'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2xhd2l6ZTd1dDZwM3VicHd6NHR5OGF0MDZ6NzE0MWU3NW5vOGllcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9Y5BbDSkSTiY8/giphy.gif',
    harvest: 'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif',
    water:   'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWJsOHBmZjRmYzFka2x4bnJ4azhkdnF3NTZtZzFranpxMWc3aHlseCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l46Cy1rHbQ92uuLXa/giphy.gif',
    barn:    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXBxZGc2NTZ4N3ZuaWo5NzgxMWIxNmxobThzeGVib29zdnlncXg5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT1XGzAnABSXy8DPCU/giphy.gif',
    craft:   'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzY0eTFudHZ3bXlucXhnb2RjNmJqOWM4MHQwZDI3cHNlOWVtYzdjeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IG6UnfQjFcFXEBzGGg/giphy.gif',
    pest:    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    levelup: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif'
  },
  // Crop thumbnails
  crops: {
    carrots:     'https://i.imgur.com/mPoHqaS.png',
    wheat:       'https://i.imgur.com/vwnVUZJ.png',
    tomatoes:    'https://i.imgur.com/IIr7T7K.png',
    potatoes:    'https://i.imgur.com/PXvOe5V.png',
    corn:        'https://i.imgur.com/m8lNhGY.png',
    dragonfruit: 'https://i.imgur.com/abcXYZ.png',
    starfruit:   'https://i.imgur.com/defABC.png',
    moonberry:   'https://static.wikia.nocookie.net/sololeveling/images/7/72/Antares.png'
  },
  // Animal thumbnails
  animals: {
    chicken: 'https://i.imgur.com/RuqkIVn.png',
    cow:     'https://i.imgur.com/NQJKVRD.png',
    bee:     'https://i.imgur.com/6jWnI5p.png',
    dragon:  'https://static.wikia.nocookie.net/sololeveling/images/d/d0/Kamish.png'
  }
};

// ─── DUNGEON GIFS ─────────────────────────────────────────
const DUNGEON_MEDIA = {
  // Room type images
  rooms: {
    combat:   null, // uses monster image
    boss:     null, // uses boss image
    treasure: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    fountain: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWJsOHBmZjRmYzFka2x4bnJ4azhkdnF3NTZtZzFranpxMWc3aHlseCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l46Cy1rHbQ92uuLXa/giphy.gif',
    shrine:   'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWpzY2huMW9pZXZraWt5czh0dXh3a2FpenZtY3VoaGhwNWN6YXJpYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI6hkM8YEdxFT44/giphy.gif',
    trap:     'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    merchant: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWtzYzVnenFmbGlvbjk4dWFyY2ZjNzFsdng3eGdnNm9wNjZ3OXVtYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPEqDGUULpEU0aQ/giphy.gif'
  },
  // Combat actions
  combat: {
    attack:  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjAzZXRidHQycXc0N3pkb282NGtiMndtODBhdmtlenByc3htenZtciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4FGt6g4KDGVB4OhW/giphy.gif',
    crit:    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHM4cnNmaGp3Y3gyeGdjaXp0d3hkNW92dHlqbnp0cnd3OGJ4aGFyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oz8xKaR836UJOYeOc/giphy.gif',
    victory: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMHczZm1wM2E4enFsajFoenZicjJlc2VqZzQ5b3VtcGRhYm1zaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4lOMA8JKSnL9Uk/giphy.gif',
    defeat:  'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGZsZzk1YjN5ZjNzdm1rbXBqOW0xcWdubXVwazRiZnVjNXR3bGFhbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif',
    boss_appear: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjAzZXRidHQycXc0N3pkb282NGtiMndtODBhdmtlenByc3htenZtciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4FGt6g4KDGVB4OhW/giphy.gif',
    shadow_extract: 'https://static.wikia.nocookie.net/sololeveling/images/4/4d/Architect.png'
  }
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────

/**
 * Pick a media URL by game name and state
 */
function getMedia(game, state) {
  const category = GAME_MEDIA[game];
  if (!category) return GAME_MEDIA.general[state] || null;
  return category[state] || GAME_MEDIA.general[state] || null;
}

function getFarmMedia(category, key) {
  const cat = FARM_MEDIA[category];
  if (!cat) return null;
  return cat[key] || null;
}

function getDungeonMedia(category, key) {
  const cat = DUNGEON_MEDIA[category];
  if (!cat) return null;
  return cat[key] || null;
}

/**
 * Set image on embed from media registry (with safe fallback)
 */
function setEmbedMedia(embed, game, state, fallbackUrl = null) {
  const url = getMedia(game, state) || fallbackUrl;
  if (url) embed.setImage(url);
  return embed;
}

/**
 * Set farm image on embed
 */
function setFarmMedia(embed, category, key) {
  const url = getFarmMedia(category, key);
  if (url) embed.setImage(url);
  return embed;
}

module.exports = {
  GAME_MEDIA, FARM_MEDIA, DUNGEON_MEDIA,
  getMedia, getFarmMedia, getDungeonMedia,
  setEmbedMedia, setFarmMedia
};
