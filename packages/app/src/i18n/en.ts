/** English — source of truth. Every other locale must define exactly these keys (enforced by a test). */
export const en = {
  // common
  'common.back': 'Back', 'common.play': 'Play', 'common.close': 'Close', 'common.cancel': 'Cancel', 'common.map': 'Map', 'common.event': 'Event',
  'common.moves': 'moves', 'common.level': 'Level', 'common.stage': 'Stage', 'common.lives': 'Lives', 'common.coins': 'Coins', 'common.score': 'Score',
  'common.notEnoughCoins': 'not enough coins', 'common.locked': 'locked', 'common.claim': 'claim', 'common.claimed': 'claimed',
  // splash
  'splash.tagline': 'Match, evolve and discover every emoji.', 'splash.continue': 'Continue · Level {n}',
  // map
  'map.world': 'World {n} · {name}', 'map.nav.dex': 'dex', 'map.nav.lab': 'lab', 'map.nav.daily': 'daily', 'map.nav.shop': 'shop', 'map.nav.options': 'options',
  'map.secretHint': 'All 60 stars discover a secret emoji', 'map.livesFull': 'lives are full', 'map.eventLocked': 'Unlocks at level 6', 'map.boss': 'boss', 'map.hard': 'hard',
  // level sheet
  'sheet.goals': 'Goals', 'sheet.moves': '{n} moves', 'sheet.booster': 'Start with a booster', 'sheet.play': 'Play', 'sheet.boss': '👑 boss', 'sheet.hard': '🔥 hard',
  // goals
  'goal.points': 'points', 'goal.dust': 'dust', 'goal.cages': 'cages', 'goal.blockers': 'blockers',
  // hud
  'hud.pause': 'pause', 'hud.hint': 'hint', 'hud.sound': 'sound', 'hud.muted': 'muted',
  'hud.hintGlow': 'a move is glowing on the board', 'hud.noMoves': 'no moves — the board will shuffle',
  'hud.hammerOn': 'tap a piece to smash it', 'hud.hammerOff': 'hammer put away', 'hud.shuffled': 'shuffled — no move spent',
  'hud.hammerTitle': 'Hammer — smash any piece', 'hud.shuffleTitle': 'Shuffle the board',
  'hud.discovered': '<b>{name}</b> discovered', 'hud.extraMoves': '+5 moves — make them count!',
  // combos
  'combo.2': 'NICE', 'combo.3': 'GREAT', 'combo.4': 'AMAZING', 'combo.5': 'WOW', 'combo.6': 'UNREAL', 'combo.7': 'LEGENDARY',
  // pause
  'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.quit': 'Quit', 'pause.restart': 'Restart', 'pause.lifeKept': 'life kept — see you on the map',
  // win
  'win.title': 'Level {n} complete!', 'win.stageTitle': 'Stage {n} complete!', 'win.boss': '· 👑 boss defeated', 'win.discovered': 'discovered',
  'win.next': 'Next level', 'win.nextStage': 'Next stage', 'win.rewards': 'Rewards', 'win.allDone': 'You finished every level — more worlds coming!',
  // lose
  'lose.soClose': 'So close!', 'lose.out': 'Out of moves', 'lose.soCloseSub': 'You were almost there — keep going?', 'lose.outSub': 'Every attempt teaches the board.',
  'lose.extra': '+5 moves', 'lose.retry': 'Try again',
  // lives
  'lives.title': 'Out of lives', 'lives.next': 'Next life in', 'lives.refill': 'Refill {n} lives', 'lives.wait': "I'll wait",
  // tutorials
  'tut.gotIt': 'Got it!',
  'tut.swap.title': 'Swap to match', 'tut.swap.text': 'Swipe a piece toward a neighbour. Line up 3 identical emojis and they <b>evolve</b> into the next one: 🌱🌱🌱 → 🌿',
  'tut.rocket.title': 'Rocket 🚀', 'tut.rocket.text': 'Match <b>4 in a line</b> to make a 🚀. Swap or tap it to clear a whole row or column.',
  'tut.bomb.title': 'Bomb 💣', 'tut.bomb.text': 'Match in an <b>L or T shape</b> to make a 💣. It blasts a 3×3 area. Combine 💣 + 🚀 for a mega blast!',
  'tut.rock.title': 'Rocks 🪨', 'tut.rock.text': 'Rocks block the board. Make a match <b>next to</b> a rock to break it.',
  'tut.ice.title': 'Ice 🧊', 'tut.ice.text': 'Ice needs <b>two hits</b>. Match next to it twice, or blast it with a special.',
  'tut.dust.title': 'Dust 🟪', 'tut.dust.text': 'Some cells are covered in dust. <b>Match on top</b> of them to clean them. Dark dust needs two matches.',
  'tut.cage.title': 'Cages 🔗', 'tut.cage.text': 'Caged pieces cannot move. Include them in a match (or blast them) to <b>break the cage</b>.',
  'tut.wild.title': 'Wild star 🌟', 'tut.wild.text': 'Match <b>5 in a line</b> to make a 🌟. Swap it with any piece to clear every piece of that kind!',
  'tut.synergy.title': 'Combos 💥', 'tut.synergy.text': 'Swap two specials together: 💣+🚀 = mega cross · 💣+💣 = huge blast · 🚀+🚀 = row + column · 🌟+💣 turns every piece into bombs!',
  'tut.holes.title': 'Odd boards', 'tut.holes.text': 'Some boards have missing cells. Pieces cannot fall through them — plan around the gaps.',
  // daily
  'daily.title': 'Daily gift', 'daily.sub': 'Come back every day for bigger rewards', 'daily.claimedSub': 'Already claimed — see you tomorrow!', 'daily.day': 'Day {n}',
  'daily.claim': 'Claim', 'daily.claimed': 'Claimed', 'daily.got': 'Day {n}',
  // dex
  'dex.title': 'Emoji-dex', 'dex.unknown': '???', 'dex.vault': 'vault', 'dex.recipes': 'Recipes', 'dex.noEchoes': 'No echoes revealed yet.', 'dex.reveal': 'Reveal echo {n}/3',
  'dex.allEchoes': 'All echoes revealed', 'dex.earnIn': 'Earn it in the <b>{name}</b> event', 'dex.liveNow': '— <b>live now!</b>', 'dex.path': 'Evolution path',
  'dex.family.elements': 'Elements', 'dex.family.sky': 'Sky & Weather', 'dex.family.flora': 'Flora', 'dex.family.fauna': 'Fauna', 'dex.family.food': 'Food',
  'dex.family.emotions1': 'Emotions I', 'dex.family.objects': 'Objects', 'dex.family.cosmic': 'Cosmic', 'dex.family.emotions2': 'Emotions II',
  'dex.family.festive': 'Festive', 'dex.family.mythic': 'Mythic', 'dex.family.arcane': 'Arcane',
  'rarity.common': '⚪ Common', 'rarity.rare': '🟢 Rare', 'rarity.epic': '🟣 Epic', 'rarity.legendary': '🟡 Legendary',
  // lab
  'lab.title': 'Laboratory', 'lab.mix': 'Mix', 'lab.clear': 'Clear', 'lab.ingredients': 'Your ingredients', 'lab.noIngredients': '— play levels to collect pieces',
  'lab.found': 'Recipes found', 'lab.none': 'Nothing yet. Mix two ingredients!', 'lab.noRecipe': 'nothing happened… {echo}', 'lab.newRecipe': 'new recipe!',
  'lab.known': 'known recipe', 'lab.added': 'Added to the Dex!', 'lab.nice': 'Nice!', 'lab.echoDefault': 'It exists…', 'lab.addedToast': 'added to your Emoji-dex',
  'lab.type.physical': 'physical', 'lab.type.metamorphic': 'metamorphic', 'lab.type.psychological': 'psychological',
  // shop
  'shop.title': 'Shop', 'shop.intro': 'Earn 🪙 by winning levels, daily gifts and 3-star runs. Boosters never cost moves.', 'shop.purchased': '{name} purchased',
  'shop.hammer': 'Hammer', 'shop.hammer.ds': 'Destroy any single piece or obstacle', 'shop.shuffle': 'Shuffle', 'shop.shuffle.ds': 'Reshuffle the whole board',
  'shop.rocket': 'Rocket', 'shop.rocket.ds': 'Start the level with a 🚀', 'shop.bomb': 'Bomb', 'shop.bomb.ds': 'Start the level with a 💣',
  'shop.wild': 'Wild star', 'shop.wild.ds': 'Start the level with a 🌟', 'shop.life': 'Life', 'shop.life.ds': 'One extra life right now',
  // settings
  'set.title': 'Options', 'set.music': 'Music', 'set.sfx': 'Sound effects', 'set.haptics': 'Vibration', 'set.language': 'Language', 'set.progress': 'Progress',
  'set.progressValue': 'Lv {lv} · {dex}/144 emojis · {coins} 🪙', 'set.install': 'Install app', 'set.installBtn': 'Install', 'set.achievements': 'Achievements',
  'set.reset': 'Reset game', 'set.resetTitle': 'Reset everything?', 'set.resetSub': 'Levels, stars, coins and the Emoji-dex will be erased.', 'set.resetBtn': 'Reset',
  'set.credits': 'Emojiverse v{v} · Noto Emoji © Google (Apache 2.0)',
  'set.backup': 'Backup', 'set.export': 'Copy save code', 'set.import': 'Paste save code', 'set.exported': 'save code copied — keep it safe', 'set.imported': 'progress restored',
  'set.importTitle': 'Restore progress', 'set.importSub': 'Paste a save code from another device. This replaces the current progress.', 'set.importBad': 'that code is not valid',
  'set.share': 'Share', 'set.download': 'Download file',
  // event
  'ev.vaultEmojis': 'vault emojis', 'ev.stages': 'stages', 'ev.paths': 'Evolution paths this week', 'ev.milestones': 'Milestone rewards',
  'ev.footer': 'Stages reset when the event rotates. Everything you discover stays in your Emoji‑dex forever.',
  'ev.emotions2.name': 'Masquerade', 'ev.emotions2.tag': 'Every face hides another',
  'ev.festive.name': 'Fiesta', 'ev.festive.tag': 'Light the lanterns, cut the cake',
  'ev.mythic.name': 'Legends', 'ev.mythic.tag': 'Old tales wake up hungry',
  'ev.arcane.name': 'Secrets', 'ev.arcane.tag': 'What the universe whispers',
  // achievements
  'ach.first_win': 'First Sprout|Win your first level', 'ach.wins_25': 'Regular|Win 25 levels', 'ach.wins_100': 'Veteran|Win 100 levels',
  'ach.stars_30': 'Stargazer|Earn 30 stars', 'ach.stars_150': 'Constellation|Earn 150 stars', 'ach.stars_all': 'Perfectionist|Earn all 420 stars',
  'ach.dex_10': 'Collector|Discover 10 emojis', 'ach.dex_50': 'Archivist|Discover 50 emojis', 'ach.dex_launch': 'Encyclopedia|Discover all 96 launch emojis',
  'ach.dex_all': 'Emojiverse|Discover every emoji', 'ach.mix_1': 'Apprentice|Find your first recipe', 'ach.mix_25': 'Alchemist|Find 25 recipes',
  'ach.mix_all': 'Grand Alchemist|Find all 71 recipes', 'ach.combo_5': 'On Fire|Chain a ×5 combo', 'ach.combo_8': 'Unreal|Chain a ×8 combo',
  'ach.streak_5': 'Unstoppable|Win 5 levels in a row', 'ach.daily_7': 'Loyal|Claim 7 daily gifts in a row',
  // worlds
  'world.1': 'Joy|Everything begins with a smile', 'world.2': 'Melancholy|Rain makes the garden grow', 'world.3': 'Fury|Heat forges everything',
  'world.4': 'Dream|Night is full of stars', 'world.5': 'Fear|What hides in the fog?', 'world.6': 'Love|Two smiles make a heart', 'world.7': 'Wonder|Everything connects',
} as const;
export type Key = keyof typeof en;
