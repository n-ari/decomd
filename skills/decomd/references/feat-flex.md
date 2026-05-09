# flex

`<!-- decomd: flex -->` を heading の直下に置くと、その heading の直接の子 heading セクションをフレックス表示にします。

```md
# Services
<!-- decomd: flex -->

## Design
UI design.

## Build
Implementation.
```

幅が広い環境では横並びになり、狭い環境では折り返します。カード的に並べたいが、列数を固定したくないときに使います。
