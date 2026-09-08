#!/usr/bin/env python3
"""Deterministic R6 editorial fallback renderer.

Runs without OpenGL, X11, EGL, OSMesa, VTK, or a browser. It deliberately
uses Pillow so GitHub-hosted Linux runners can always generate production
fallback frames for the six R6 hero chapters.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "fallback" / "r6"
OUT.mkdir(parents=True, exist_ok=True)

# Runtime/legacy slug plus the semantic R6 alias used by the art-direction docs.
HEROES = [
    ("hero-campus", "integrated-campus"),
    ("manufacturing", "manufacturing-line"),
    ("power-generation", "substation-bess"),
    ("data-centers", "data-center-cooling"),
    ("recycling", "recycling-intake"),
    ("closing-platform", "connected-campus"),
]


def draw_frame(idx: int) -> Image.Image:
    w, h = 1600, 900
    bg = (238, 231, 220) if idx != 3 else (230, 233, 225)
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse((450, -180, 1420, 980), fill=(250, 248, 242, 185))

    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.ellipse((570, 610, 1350, 790), fill=(30, 34, 34, 36))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    img = Image.alpha_composite(img.convert("RGBA"), shadow)
    d = ImageDraw.Draw(img, "RGBA")

    ink = (55, 61, 59, 255)
    mid = (128, 137, 132, 255)
    light = (194, 199, 194, 255)
    accent = (201, 143, 70, 255)
    glass = (78, 113, 130, 220)

    def building(x: int, y: int, bw: int, bh: int, depth: int = 55, fill=light):
        d.polygon(
            [(x, y), (x + bw, y), (x + bw - depth, y - depth), (x - depth, y - depth)],
            fill=(220, 221, 215, 255),
        )
        d.rectangle((x, y, x + bw, y + bh), fill=fill)
        d.polygon(
            [(x + bw, y), (x + bw - depth, y - depth), (x + bw - depth, y + bh - depth), (x + bw, y + bh)],
            fill=(130, 136, 132, 255),
        )
        d.line((x, y, x + bw, y), fill=(255, 255, 250, 220), width=5)
        d.line((x + bw, y, x + bw, y + bh), fill=(68, 73, 71, 180), width=4)

    if idx == 0:
        building(760, 390, 360, 190)
        building(1120, 470, 210, 130, 40, fill=(93, 101, 98, 255))
        building(610, 500, 180, 100, 35)
        for r in range(4):
            for c in range(7):
                x, y = 560 + c * 72, 610 + r * 28
                d.polygon([(x, y), (x + 58, y), (x + 48, y + 20), (x - 10, y + 20)], fill=(30, 56, 76, 255))
        # paired clean-energy silhouettes
        for tx in (1260, 1370):
            d.line((tx, 330, tx, 600), fill=(230, 230, 224, 255), width=8)
            d.line((tx, 330, tx - 55, 285), fill=(230, 230, 224, 255), width=6)
            d.line((tx, 330, tx + 63, 300), fill=(230, 230, 224, 255), width=6)
            d.line((tx, 330, tx + 10, 255), fill=(230, 230, 224, 255), width=6)
    elif idx == 1:
        for i in range(9):
            x = 600 + i * 80
            d.line((x, 350, x, 690), fill=ink, width=11)
            d.line((x, 350, x + 70, 300), fill=ink, width=8)
        d.rectangle((570, 570, 1320, 620), fill=(92, 99, 96, 255))
        for i in range(8):
            building(610 + i * 84, 470, 62, 80, 12, fill=(185, 191, 188, 255))
        d.line((570, 335, 1300, 335), fill=(255, 255, 250, 220), width=5)
        # process lights and safety stripe
        for i in range(8):
            d.ellipse((635 + i * 84, 495, 645 + i * 84, 505), fill=accent)
        d.line((580, 640, 1310, 640), fill=accent, width=5)
    elif idx == 2:
        for i in range(4):
            building(600 + i * 145, 520, 110, 90, 18, fill=(225, 225, 216, 255))
        for i in range(4):
            x = 730 + i * 125
            d.line((x, 300, x, 560), fill=ink, width=9)
            d.line((x - 55, 330, x + 55, 330), fill=ink, width=8)
            for p in range(3):
                d.ellipse((x - 12, 360 + p * 45, x + 12, 384 + p * 45), fill=(235, 235, 225, 255))
        building(1120, 460, 230, 140, 35, fill=(117, 124, 121, 255))
        for x in (660, 820, 980, 1140):
            d.line((x, 380, x + 95, 380), fill=(154, 93, 48, 255), width=5)
    elif idx == 3:
        building(760, 330, 500, 260, 70, fill=(170, 178, 175, 255))
        for i in range(11):
            d.rectangle((800 + i * 38, 390, 810 + i * 38, 575), fill=(93, 103, 100, 255))
        for i in range(5):
            building(560 + i * 105, 610, 80, 70, 15, fill=(184, 192, 192, 255))
            d.ellipse((580 + i * 105, 604, 620 + i * 105, 624), fill=(50, 55, 54, 255))
        d.line((565, 700, 1080, 700), fill=glass, width=7)
    elif idx == 4:
        building(960, 380, 360, 210, 55, fill=(177, 183, 178, 255))
        d.rectangle((570, 430, 880, 458), fill=(76, 82, 80, 255))
        d.polygon([(570, 445), (910, 445), (1060, 610), (720, 610)], fill=(103, 111, 106, 255))
        for i in range(5):
            building(650 + i * 95, 520, 72, 90, 14, fill=(108, 126, 109, 255))
        d.rectangle((620, 335, 920, 357), fill=(82, 88, 85, 255))
        for i in range(6):
            d.rectangle((690 + i * 68, 625, 730 + i * 68, 648), fill=(123, 132, 118, 255))
    else:
        building(650, 430, 260, 150)
        building(930, 400, 300, 180)
        building(1190, 500, 180, 100, 35, fill=(102, 111, 108, 255))
        building(760, 620, 190, 85, 30, fill=(111, 126, 111, 255))
        d.line((650, 740, 1320, 740), fill=accent, width=8)
        for x in (760, 980, 1200):
            d.ellipse((x - 8, 732, x + 8, 748), fill=(242, 223, 190, 255))

    # Quiet foreground guide and restrained highlights preserve the editorial tone.
    d.line((610, 760, 1340, 760), fill=(118, 120, 111, 70), width=2)
    d.line((620, 785, 930, 785), fill=mid, width=2)
    return img.convert("RGB")


def main() -> None:
    for idx, (legacy, semantic) in enumerate(HEROES):
        image = draw_frame(idx)
        for slug in (legacy, semantic):
            path = OUT / f"{slug}.webp"
            image.save(path, "WEBP", quality=92, method=6)
            print(f"fallback {slug:20s} -> {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
