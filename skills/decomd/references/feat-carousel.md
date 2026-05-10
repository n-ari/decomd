# carousel

`<!-- decomd: carousel -->` を heading の直下に置くと、その heading の直接の子 heading セクションを横スクロールのカルーセルにします。

```md
# Gallery
<!-- decomd: carousel -->

## One
First item.

## Two
Second item.
```

生成 HTML は `decomd-carousel` の中に、スクロール領域の `decomd-carousel-viewport`、各スライドの `decomd-carousel-slide`、スライドへ移動する `decomd-carousel-nav` のドットリンクを持ちます。

バンドル CSS では 1 スライドずつ見える横スクロール領域として表示され、スクロールスナップとドットリンクで JavaScript なしに移動できます。
