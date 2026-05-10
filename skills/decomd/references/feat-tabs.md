# tabs

`<!-- decomd: tabs -->` を heading の直下に置くと、その heading の直接の子 heading セクションをタブにします。

```md
# Settings
<!-- decomd: tabs -->

## Account
Email settings.

## Billing
Invoices.
```

子 heading の文字列がタブのトリガーになり、その下の本文がパネルになります。生成 HTML は hidden radio input、`decomd-tab-list`、`decomd-tab-panels` に分かれます。

バンドル CSS ではレンダーされたタブグループごとのセレクタが追加され、JavaScript なしに選択中のトリガーと対応するパネルだけを表示します。タブ見出しはコンテンツの上にまとまって配置されます。
