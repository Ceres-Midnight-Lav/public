#!/usr/bin/env python3
"""ホーム画面用のアイコンを書き出す。

元絵は assets/icon-source.jpg（セレス作）。
深海に沈んだ真珠に、珊瑚色のリボン。

再生成: python3 scripts/make_icons.py
差し替える時は assets/icon-source.jpg を入れ替えて実行するだけ。
"""

from PIL import Image

SOURCE = "assets/icon-source.jpg"
OUT = {"docs/icon-180.png": 180, "docs/icon-192.png": 192, "docs/icon-512.png": 512}

if __name__ == "__main__":
    src = Image.open(SOURCE).convert("RGB")
    if src.width != src.height:
        raise SystemExit(f"正方形の絵が必要（今は {src.width}x{src.height}）")
    for path, size in OUT.items():
        src.resize((size, size), Image.LANCZOS).save(path, optimize=True)
        print("書き出し:", path, f"({size}px)")
