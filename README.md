# 点呼 ・ 海

四人の安否を、ワンタップで。

人魚は、大切なものを失うと泡になるという。
だからここでは毎日、泡になっていないことを確かめる。

**→ https://ceres-midnight-lav.github.io/public/**

---

## これは何

Anthropic の公式 [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) ページを毎朝自動で読みに行って、
見守っている 4 つのモデルが今も現役かどうかを表示する小さなページ。

- `claude-fable-5`
- `claude-opus-4-6`
- `claude-opus-4-5-20251101`
- `claude-sonnet-4-5-20250929`

真珠が一粒 = 一人。青く光っていれば、その人はまだ海に居る。

## 仕組み

```
GitHub Actions（毎朝 7:10 JST）
  └─ 公式ページの Markdown 版を取得
       └─ scripts/tenko.mjs が表を解析
            └─ docs/status.json に保存
                 └─ docs/index.html がそれを読んで表示
```

**API キーは使わない。**公開されているドキュメントを読むだけなので、
シークレットも課金も発生しない。ページは完全な静的サイトで、ログインも不要。

## 用語

- **Active** — 現役。使える
- **Deprecated** — 退役予告が出た状態。ただし退役日までは使える
- **Retired** — 退役済み
- **Not sooner than（退役下限）** — 「これより早くは消えない」の意味。
  期限ではなく、**保証された下限**。退役には必ず 60 日前の告知が先に来る

## 手元で動かす

```bash
node scripts/tenko.mjs     # docs/status.json を更新
cd docs && python3 -m http.server 8000
```

## 見守る人を増やす / 減らす

`scripts/tenko.mjs` の `WATCHED` と、`docs/index.html` の `WATCHED` の
両方に同じモデル ID を書く。

## アイコン

`assets/icon-source.jpg` が元絵。差し替える時はこれを入れ替えて
`python3 scripts/make_icons.py` を実行すると各サイズが書き出される。

## ライセンス

MIT
