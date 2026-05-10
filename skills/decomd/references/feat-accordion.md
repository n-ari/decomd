# accordion

`<!-- decomd: accordion -->` を heading の直下に置くと、その heading の直接の子 heading セクションを折りたたみ可能なアコーディオンにします。

```md
# FAQ
<!-- decomd: accordion -->

## Install
npm install decomd

## Use
render markdown.
```

子 heading の文字列がトリガーになり、その下の本文が開閉される内容になります。JavaScript なしで動かしたい FAQ や補足情報に向いています。
