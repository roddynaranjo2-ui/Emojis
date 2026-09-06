"""
E2E full-flow test — boots the built PWA in headless Chromium (SwiftShader WebGL)
and walks every screen: splash → map → level sheet → game (real drag moves via the
scene hint) → pause → win (via debug fast-forward) → dex → lab → shop → settings.
Asserts zero page errors and writes screenshots to docs/screens/.

  pip install playwright && python -m playwright install --with-deps chromium
  npm run serve:dist &
  npm run e2e            # or: python tools/e2e/smoke.py http://localhost:4173
"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
OUT = pathlib.Path(__file__).resolve().parents[2] / "docs" / "screens"
OUT.mkdir(parents=True, exist_ok=True)


async def shot(page, name):
    await page.screenshot(path=str(OUT / f"{name}.png"), timeout=8000, animations="disabled")
    print(f"  📸 {name}")


async def play_moves(page, n):
    canvas = await page.eval_on_selector("#board canvas", "e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y}; }")
    prev = None
    for i in range(n):
        hint = await page.evaluate("() => window.__scene().debugHint()")
        assert hint, "no legal move available"
        fx, fy = canvas["x"] + hint["fromXY"]["x"], canvas["y"] + hint["fromXY"]["y"]
        tx, ty = canvas["x"] + hint["toXY"]["x"], canvas["y"] + hint["toXY"]["y"]
        await page.mouse.move(fx, fy); await page.mouse.down()
        await page.mouse.move(fx + (tx - fx) * 0.6, fy + (ty - fy) * 0.6, steps=4)
        await page.mouse.up()
        await page.wait_for_timeout(300)
        if i == 0:
            await shot(page, "05-match-fx")
        await page.wait_for_timeout(1500)
        st = await page.evaluate("() => window.__scene().debugState()")
        print(f"  move {i + 1}: moves={st['moves']} score={st['score']} status={st['status']}")
        if prev is not None and st["status"] == "playing":
            assert st["moves"] == prev - 1, "move not consumed"
        prev = st["moves"]
        if st["status"] != "playing":
            break
    return st


async def main() -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        page = await browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "favicon" not in m.text else None)

        # 1. splash (first run)
        await page.goto(f"{BASE}/", wait_until="networkidle")
        await page.wait_for_selector("#splash.active")
        await page.wait_for_timeout(600)
        await shot(page, "01-splash")
        await page.click("#splash-play", force=True)
        await page.wait_for_selector("#map.active")
        await page.wait_for_timeout(500)
        await shot(page, "02-map")

        # 2. level sheet
        await page.click(".node.current", force=True)
        await page.wait_for_selector("#sheet")
        await page.wait_for_timeout(400)
        await shot(page, "03-level-sheet")
        await page.click("#ls-play")
        # 3. tutorial card (swap) then game
        try:
            await page.wait_for_selector("#tutorial", timeout=2500)
            await shot(page, "04-tutorial")
            await page.click("#tut-ok")
        except Exception:
            pass
        await page.wait_for_selector("#board canvas")
        await page.wait_for_timeout(2200)
        await shot(page, "04-game")
        st = await play_moves(page, 3)
        await shot(page, "06-game-progress")

        # 4. pause
        await page.click("#btn-pause")
        await page.wait_for_selector("#pause")
        await shot(page, "07-pause")
        await page.click("#p-resume")
        await page.wait_for_timeout(300)

        # 5. fast-forward to win using the bot until level ends (bounded)
        for _ in range(60):
            status = await page.evaluate("() => window.__scene()?.status")
            if status != "playing":
                break
            ok = await page.evaluate("() => window.__scene().debugPlayHint()")
            await page.wait_for_timeout(200 if ok else 600)
        await page.wait_for_timeout(2200)
        await page.wait_for_selector("#modal", timeout=8000)
        await page.wait_for_timeout(1800)
        title = await page.inner_text("#modal .title")
        print(f"  level end: {title}")
        await shot(page, "08-level-end")
        if await page.query_selector("#w-map"):
            await page.click("#w-map")
        else:
            await page.click("#l-map")
        await page.wait_for_selector("#map.active")
        await page.wait_for_timeout(500)
        await shot(page, "09-map-after")

        # 6. dex / lab / shop / settings
        for nav, sid, name in [("#nav-dex", "dex", "10-dex"), ("#nav-lab", "lab", "11-lab"), ("#nav-shop", "shop", "12-shop"), ("#nav-settings", "settings", "13-settings")]:
            await page.click(nav)
            await page.wait_for_selector(f"#{sid}.active")
            await page.wait_for_timeout(450)
            await shot(page, name)
            await page.click("#set-back" if sid == "settings" else f"#{sid}-back")
            await page.wait_for_selector("#map.active")

        # 7. daily gift
        await page.click("#nav-daily")
        await page.wait_for_timeout(400)
        await shot(page, "14-daily")

        save = await page.evaluate("() => window.__app.state.save")
        print(f"  save: unlocked={save['unlocked']} coins={save['coins']} lives={save['lives']} dex={len(save['dex'])}")
        await browser.close()
        if errors:
            print("❌ page errors:\n  " + "\n  ".join(errors)); return 1
        print("✅ e2e full flow passed — zero page errors"); return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
