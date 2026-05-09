# form

`<!-- decomd: form -->` を表の直前に置くと、その表をフォームに置き換えます。

```md
<!-- decomd: form -->
| label | name | type | default |
| --- | --- | --- | --- |
| Title | title | text | |
| Count | count | number | 1 |
```

列は `label`, `name`, `type`, `default` です。`type` を省略すると `text`、`default` を省略すると空になります。`label` または `name` の片方が空なら、もう片方で補完されます。

この機能はフォームの見た目と入力要素だけを作ります。送信ボタン、入力データの加工、クリップボードへのコピーなどの動作は、別途インライン HTML や JavaScript で実装します。
