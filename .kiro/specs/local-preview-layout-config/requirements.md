# Requirements Document

## Project Description (Input)
1. デプロイ前にローカルでレイアウトを簡単に確認する手段が欲しい。2. フォントサイズも変更できるようになりたい。解像度を変えられるならフォントサイズは別に変更しなくても良いです。画像を埋め込むサイトの読み込み速度の向上を意図しています。config.tsや.envで指定できるやつは変更できて欲しい。
また、textWidthがwidthより大きい時はNGであるが、それより小さい時はtextWidthを優先してください。たとえば、width=1200, textWidth=800 なら左200 800 200 。 width=600, textWidth=600なら 0 600 0 。
今の実装だと、左側のpadding/marginは固定されてしまっていて動きません。
ブログタイトルとタイトルの左端は揃えてください。

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->
