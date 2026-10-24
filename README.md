# ことばの森 English（試作品 v0.1）

モフルンと一緒に英語を学ぶ、オフライン対応の英語学習PWAの最初の試作品です。
ビルド不要のHTML / CSS / JavaScriptだけで動きます。

## 入っている機能

- モフルンの仮ビジュアル（SVG。表情4種：normal / happy / cheer / think）
- ホーム：今日のミッション、学習開始、進捗（覚えたことば・連続学習・復習まち）、レッスン一覧
- 単語学習：英単語・意味・品詞・例文、発音ボタン
- 4択クイズ：英→日、日→英を交互に出題。正誤判定とモフルンの反応
- 結果：正解数、星、覚えたことば、まちがえたことば
- 復習：まちがえたことばの一覧と再挑戦（正解するとリストから外れる）
- きろく：学習日数、連続日数、合計時間、正答率、最近の学習、発音のオン／オフ、きろくの消去
- オフライン：Service Workerがアプリ本体と全教材を端末に保存
- PWA：manifest とアイコンを用意（ホーム画面に追加できる）

## 動かし方

Service Worker は `file://` では動かないので、ローカルサーバーで開きます。

```sh
cd kotoba-no-mori
python3 -m http.server 8000
# → http://localhost:8000/ を開く
```

一度開いたあと、通信を切って再読み込みしても学習できます。
スマホでホーム画面に追加するには、HTTPSで公開する必要があります（GitHub Pages や Netlify など）。

## ファイル構成

```
index.html            画面の土台
app.css               デザイン（ライト／ダーク両対応）
app.js                アプリ本体（画面・クイズ・保存）
mofurun.js            モフルンのSVG
sw.js                 オフライン用 Service Worker
manifest.webmanifest  PWAの設定
icons/                アプリアイコン
data/courses.json     コースとレッスンの目次
data/lessons/*.json   レッスンごとの教材
```

## 教材の追加方法

1. `data/lessons/` にJSONを1つ追加する（下の形式）。
2. `data/courses.json` の該当コースの `lessons` に `{ "id": ..., "file": ... }` を足す。
3. 新しいコース（英検4級など）を開くときは、そのコースの `status` を `"available"` にする。

プログラムの変更は不要です。Service Worker も `courses.json` を見て教材を保存します。

```json
{
  "id": "e5-colors",
  "title": "いろ",
  "subtitle": "身のまわりの色",
  "kind": "word",
  "words": [
    {
      "id": "e5-colors-red",
      "en": "red",
      "ja": "赤",
      "pos": "形容詞",
      "example": { "en": "The apple is red.", "ja": "そのりんごは赤いです。" },
      "audio": "audio/e5-colors-red.mp3"
    }
  ]
}
```

- `id` はすべての教材を通して重複しないようにします（学習きろくのキーになります）。
- `kind` は `"word"`（単語）か `"phrase"`（フレーズ）。
- 4択の選択肢は同じレッスン内の語から作るので、1レッスン4語以上にします。
- `audio` は任意です。事前収録の音声を `data/` 以下に置いてパスを書くと、それを再生します。
  無い場合は端末の読み上げ機能（Web Speech API）で発音します。

## 学習きろくの保存

ブラウザの localStorage（キー `kotobanomori:v1`）に保存します。サーバーには何も送りません。

## まだ入っていないもの（設計書 v1.0 の範囲外）

コース選択画面、単語帳、森の探検、穴埋めクイズ、事前収録音声、ピンク／ラベンダーのお友達。
