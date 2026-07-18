#!/usr/bin/env python3
"""FaviconExplorer のアプリアイコン（地球儀のドット絵）を生成する。

Web 版タイトルロゴと同じレトロな雰囲気（黒背景 + RGB444 パレットの原色）で、
32x32 の地球儀ドット絵を描画し、以下を出力する:

- iOS:     ios/SuperFaviconBrowser/Assets.xcassets/AppIcon.appiconset/AppIcon.png
           （1024x1024、ニアレストネイバー32倍）
- Android: android/app/src/main/res/drawable/ic_launcher_foreground.xml
           （adaptive icon の foreground。横方向の連続同色ランを rect に統合）

依存: Pillow (`pip install Pillow`)
"""
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
GRID = 32

IOS_ICON = REPO / 'ios/SuperFaviconBrowser/Assets.xcassets/AppIcon.appiconset/AppIcon.png'
ANDROID_FOREGROUND = REPO / 'android/app/src/main/res/drawable/ic_launcher_foreground.xml'

BLACK = (0, 0, 0)
OCEAN = (0, 85, 255)
OCEAN_DARK = (0, 0, 170)
LAND = (0, 170, 0)
LAND_LIGHT = (0, 255, 0)
WHITE = (255, 255, 255)
YELLOW = (255, 255, 0)
RED = (255, 0, 0)

pixels = [[BLACK] * GRID for _ in range(GRID)]

# --- 海: 半径14の円 ---
CX = CY = 15.5
R = 14.0
for y in range(GRID):
    for x in range(GRID):
        dx, dy = x - CX, y - CY
        if dx * dx + dy * dy <= R * R:
            pixels[y][x] = OCEAN

# --- 右下の縁を暗くして球体らしく ---
for y in range(GRID):
    for x in range(GRID):
        if pixels[y][x] != OCEAN:
            continue
        dx, dy = x - CX, y - CY
        d = (dx * dx + dy * dy) ** 0.5
        if d > 11.5 and dx + dy > 3:
            pixels[y][x] = OCEAN_DARK

# --- 大陸: (y, x開始, 長さ, 色) のラン ---
LAND_RUNS = [
    # 左の大陸（南北アメリカ風）
    (6, 12, 3, LAND_LIGHT),
    (7, 10, 6, LAND_LIGHT),
    (8, 8, 8, LAND),
    (9, 7, 8, LAND),
    (10, 6, 8, LAND),
    (11, 6, 7, LAND),
    (12, 7, 5, LAND),
    (13, 8, 4, LAND),
    (14, 9, 3, LAND),
    (15, 10, 3, LAND),
    (16, 11, 3, LAND),
    (17, 12, 3, LAND),
    (18, 12, 2, LAND),
    (19, 13, 2, LAND),
    (20, 13, 2, LAND),
    (21, 14, 1, LAND),
    # 右の大陸（ユーラシア・アフリカ風）
    (5, 17, 4, LAND_LIGHT),
    (6, 16, 7, LAND_LIGHT),
    (7, 17, 8, LAND),
    (8, 18, 8, LAND),
    (9, 19, 7, LAND),
    (10, 20, 7, LAND),
    (11, 20, 7, LAND),
    (12, 21, 6, LAND),
    (13, 21, 5, LAND),
    (14, 22, 5, LAND),
    (15, 22, 4, LAND),
    (16, 21, 4, LAND),
    (17, 20, 4, LAND),
    (18, 19, 4, LAND),
    (19, 19, 3, LAND),
    (20, 18, 3, LAND),
    (21, 17, 3, LAND),
    (22, 17, 2, LAND),
    # 左下の島
    (22, 9, 2, LAND),
    (23, 10, 2, LAND),
]
for y, x0, length, color in LAND_RUNS:
    for x in range(x0, x0 + length):
        if pixels[y][x] != BLACK:  # 円の内側だけ
            pixels[y][x] = color

# --- 左上のハイライト ---
for x, y in [(9, 5), (10, 5), (7, 6), (8, 6), (6, 7), (5, 8), (5, 9), (4, 10)]:
    pixels[y][x] = WHITE

# --- 四隅のスパークル（レトロな彩り） ---
for x, y in [(27, 3), (26, 4), (27, 4), (28, 4), (27, 5)]:
    pixels[y][x] = YELLOW
for x, y in [(3, 26), (2, 27), (3, 27), (4, 27), (3, 28)]:
    pixels[y][x] = RED

# --- iOS: 1024x1024 PNG ---
img = Image.new('RGB', (GRID, GRID))
for y in range(GRID):
    for x in range(GRID):
        img.putpixel((x, y), pixels[y][x])
img.resize((1024, 1024), Image.NEAREST).save(IOS_ICON)

# --- Android: VectorDrawable（非黒ピクセルのみ。背景は ic_launcher_background の黒） ---
paths = []
for y in range(GRID):
    x = 0
    while x < GRID:
        c = pixels[y][x]
        if c == BLACK:
            x += 1
            continue
        run = 1
        while x + run < GRID and pixels[y][x + run] == c:
            run += 1
        paths.append((f'#{c[0]:02X}{c[1]:02X}{c[2]:02X}', x, y, run))
        x += run

lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- FaviconExplorer の地球儀ドット絵アイコン。',
    '     scripts/generate-app-icons.py で生成。32x32 のドット絵をセーフゾーン(66/108)に配置 -->',
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    '    android:width="108dp"',
    '    android:height="108dp"',
    '    android:viewportWidth="108"',
    '    android:viewportHeight="108">',
    '    <group',
    '        android:translateX="21"',
    '        android:translateY="21"',
    '        android:scaleX="2.0625"',
    '        android:scaleY="2.0625"',
    '        android:pivotX="0"',
    '        android:pivotY="0">',
]
for fill, x, y, w in paths:
    lines.append(f'        <path android:fillColor="{fill}" android:pathData="M{x},{y}h{w}v1h-{w}z" />')
lines += ['    </group>', '</vector>', '']
ANDROID_FOREGROUND.write_text('\n'.join(lines))

print(f'wrote {IOS_ICON.relative_to(REPO)}')
print(f'wrote {ANDROID_FOREGROUND.relative_to(REPO)} ({len(paths)} paths)')
