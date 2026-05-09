# grid

`<!-- decomd: grid(size_x) -->` を heading の直下に置くと、その heading の直接の子 heading セクションを、`size_x` を最小幅としたグリッド表示にします。

```md
# Gallery
<!-- decomd: grid(280) -->

## Item 1
Description.

## Item 2
Description.
```

要素の最小幅を指定しながら、表示幅に応じて列数を変えたいときに使います。
