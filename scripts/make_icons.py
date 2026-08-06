#!/usr/bin/env python3
"""ホーム画面用のアイコンを描く。

深海のグラデーションに、真珠を一粒。ページと同じ色を使う。
再生成: python3 scripts/make_icons.py
"""

from PIL import Image, ImageDraw, ImageFilter

R = 1024  # 作業解像度。最後に縮小してアンチエイリアスをかける

SHINKAI_TOP = (15, 58, 114)   # #0f3a72
SHINKAI_MID = (10, 37, 80)    # #0a2550
SHINKAI_BTM = (7, 28, 62)     # #071c3e
MIZU = (124, 196, 245)        # #7cc4f5


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def background():
    """縦のグラデーション。1px幅で作って引き伸ばす"""
    col = Image.new("RGB", (1, R))
    px = col.load()
    for y in range(R):
        t = y / (R - 1)
        px[0, y] = lerp(SHINKAI_TOP, SHINKAI_MID, t / 0.52) if t < 0.52 \
            else lerp(SHINKAI_MID, SHINKAI_BTM, (t - 0.52) / 0.48)
    return col.resize((R, R), Image.BICUBIC)


def light_shafts(img):
    """斜めに差し込む光。ページの .ray と同じ気持ち"""
    layer = Image.new("L", (R, R), 0)
    d = ImageDraw.Draw(layer)
    for x0, w, a in ((0.16, 0.20, 46), (0.58, 0.14, 34)):
        d.polygon(
            [(R * x0, 0), (R * (x0 + w), 0),
             (R * (x0 + w - 0.16), R * 0.78), (R * (x0 - 0.16), R * 0.78)],
            fill=a,
        )
    layer = layer.filter(ImageFilter.GaussianBlur(R * 0.055))
    return Image.composite(Image.new("RGB", (R, R), (168, 219, 255)), img, layer)


def radial_pearl(size):
    """真珠。左上寄りにハイライト、外に向かって水色へ"""
    s = size
    ss = 4  # 縁をなめらかにするため4倍で描いて縮小する
    s4 = s * ss
    img = Image.new("RGBA", (s4, s4), (0, 0, 0, 0))
    px = img.load()
    r = s4 / 2
    cx, cy = s4 * 0.32, s4 * 0.28         # ハイライトの中心
    # ハイライトから球の一番遠い縁までの距離。CSS の 72% 相当でMIZUに達する
    far = (((cx - r) ** 2 + (cy - r) ** 2) ** 0.5 + r) * 0.72
    for y in range(s4):
        for x in range(s4):
            dx, dy = x - r, y - r
            d2 = dx * dx + dy * dy
            if d2 > r * r:
                continue
            t = min(1.0, (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / far)
            col = lerp((255, 255, 255), MIZU, t)
            # 縁をわずかに落として球に見せる
            edge = (d2 ** 0.5) / r
            if edge > 0.86:
                col = lerp(col, (58, 122, 170), (edge - 0.86) / 0.14 * 0.5)
            px[x, y] = col + (255,)
    return img.resize((s, s), Image.LANCZOS)


def bubbles(img):
    """小さな泡をいくつか。主役は食わない程度に"""
    layer = Image.new("RGBA", (R, R), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for cx, cy, rad, a in ((0.17, 0.74, 0.030, 105), (0.83, 0.30, 0.022, 85),
                           (0.76, 0.79, 0.016, 70), (0.23, 0.28, 0.013, 60)):
        x, y, rr = R * cx, R * cy, R * rad
        d.ellipse([x - rr, y - rr, x + rr, y + rr],
                  outline=(200, 232, 255, a), width=max(2, int(R * 0.0045)))
    return Image.alpha_composite(img.convert("RGBA"), layer)


def build():
    img = light_shafts(background())
    img = bubbles(img)

    # 真珠のまわりの光。ページの box-shadow にあたる部分
    pr = int(R * 0.27)
    glow = Image.new("RGBA", (R, R), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    c = R / 2
    gd.ellipse([c - pr * 1.5, c - pr * 1.5, c + pr * 1.5, c + pr * 1.5],
               fill=MIZU + (110,))
    glow = glow.filter(ImageFilter.GaussianBlur(R * 0.075))
    img = Image.alpha_composite(img, glow)

    pearl = radial_pearl(pr * 2)
    img.alpha_composite(pearl, (int(c - pr), int(c - pr)))
    return img.convert("RGB")


if __name__ == "__main__":
    master = build()
    for name, size in (("icon-180.png", 180), ("icon-192.png", 192),
                       ("icon-512.png", 512)):
        master.resize((size, size), Image.LANCZOS).save(f"docs/{name}")
        print("書き出し:", name)
