# @forloop-cc/forloop-cli

[English](../README.md) · [中文](README_zh.md) · [日本語](README_ja.md)

[ForLoop](https://forloop.cc) AI開発プラットフォームのコマンドラインインターフェース。ターミナルから離れることなく、スプリント、ストーリー、ファイル、AIエージェント、組織を管理できます。

## 目次

- [ForLoopとは？](#forloopとは)
- [インストール](#インストール)
- [クイックスタート](#クイックスタート)
- [認証](#認証)
- [コマンド](#コマンド)
  - [スプリント操作](#スプリント操作)
  - [ストーリー操作](#ストーリー操作)
  - [テンプレート操作](#テンプレート操作)
  - [エージェント操作](#エージェント操作)
  - [組織操作](#組織操作)
  - [ユーザー・クォータ操作](#ユーザークォータ操作)
  - [ファイル操作](#ファイル操作)
  - [フォルダ操作](#フォルダ操作)
  - [同期操作](#同期操作)
- [グローバルフラグ](#グローバルフラグ)
- [環境変数](#環境変数)
- [一般的なワークフロー](#一般的なワークフロー)
  - [スプリントの作業を開始する](#スプリントの作業を開始する)
  - [スプリントの計画と割り当て](#スプリントの計画と割り当て)
  - [ローカルとS3間のファイル同期](#ローカルとs3間のファイル同期)
  - [CI/CD自動化](#cicd自動化)
- [設定](#設定)
- [トラブルシューティング](#トラブルシューティング)
- [ライセンス](#ライセンス)

---

## ForLoopとは？

[ForLoop](https://forloop.cc)は、自律的な開発とデプロイのためのAIエージェントプラットフォームです。チームの司令塔と考えてください——AIエージェントと人間がスプリント、ストーリー、コードの出荷について協力する共有スペースです。

**すべてはLoop Engineeringの上に構築されています**——Plan（計画）→ Code（コーディング）→ Review（レビュー）→ Deploy（デプロイ）→ Learn（学習）の継続的なフィードバックループです。各サイクルで生成されたデータが次のサイクルにフィードバックされ、反復ごとにチームが高速化されます。このCLIは**Plan**および**Manage**フェーズを強化し、ターミナルをForLoopのスプリントプラットフォームに直接接続します。

**このCLIでできること：**
- ターミナルからスプリントの計画とストーリーの作成
- AI開発エージェントが現在構築しているものをリアルタイムで確認
- AIエージェントを起動してスプリントのストーリーを自動実装
- プロジェクトファイルをスプリントストレージにアップロード/ダウンロード
- 組織、ユーザープロファイル、クォータの管理
- シェルスクリプトやCI/CDパイプラインへのForLoopの統合

---

## インストール

### 前提条件

- **Node.js** 18以上
- **npm**（Node.jsに付属）

### グローバルインストール

```bash
npm install -g @forloop-cc/forloop-cli
```

### インストールの確認

```bash
forloop --version
# 出力: forloop 0.2.4
```

---

## クイックスタート

約30秒で接続できます：

```bash
# 1. https://forloop.cc/profile?tab=api-tokens でAPIトークンを作成
#    （トークンをコピー — "floop_" で始まります）

# 2. 認証
forloop auth login --api-key floop_xxxxx

# 3. スプリントを表示
forloop sprint list

# 4. スプリントの詳細を確認
forloop sprint get --id 66

# 5. AIエージェントの動作を確認
forloop agent developer-status --sprint 66
```

以上です。接続完了です。

---

## 認証

### APIトークンの取得

ForLoop設定ページでトークンを生成します：

| 本番環境 | https://forloop.cc/profile?tab=api-tokens |

トークンは `floop_` で始まります。少なくとも以下のスコープを持つトークンを作成してください：
- `sprint:read`, `sprint:write`
- `story:read`, `story:write`
- `agent:query`, `agent:read`
- `profile:read`

### トークンの設定

**方法1：ログインコマンド（推奨）**
```bash
forloop auth login --api-key floop_xxxxx
```
トークンは `~/.config/forloop/tokens.json` に制限付きパーミッション（0600）で保存されます。

**方法2：環境変数**
```bash
export FORLOOP_API_KEY=floop_xxxxx
```

### 認証の管理

```bash
forloop auth status          # 確認: "Token: floop_ab...xxxx, Format: valid"
forloop auth logout          # 保存されたトークンを削除
```

---

### スプリント操作

スプリント（ストーリーを保持し開発サイクルを追跡するコンテナ）を操作します。

```bash
# アクセス可能なすべてのスプリントを一覧表示
forloop sprint list
forloop sprint list --org-id 1
forloop sprint list --include-system-org    # システム組織のスプリントを含める
forloop sprint list --output json           # 構造化JSON出力

# すべてのストーリーを含むスプリントの詳細を取得
forloop sprint get --id 66
forloop sprint get --id 66 --no-stories     # ストーリーを除外
forloop sprint get --id 66 --no-files       # ファイルを除外
forloop sprint get --id 66 --output json    # 構造化JSON出力

# 新しいスプリントを作成
forloop sprint create \
  --title "スプリント15" \
  --start-date 2026-06-09 \
  --end-date 2026-06-23 \
  --description "認証システムの実装" \
  --org-id 1

# スプリントの詳細を更新
forloop sprint update --id 66 --title "更新されたタイトル"
forloop sprint update --id 66 --description "このスプリントの新しい目標"

# スプリントを削除（破壊的操作 — --confirm が必要）
forloop sprint delete --id 66 --confirm
```

> **ヒント：** CLIは `FORLOOP_SPRINT_ID` 環境変数または `sprint-66` という名前のgitブランチから自動的にスプリントを検出します。多くの場合 `--id` を省略でき、正しいスプリントが選択されます。

### ストーリー操作

ストーリーはスプリント内の作業項目です。テンプレートから作成して一貫した構造を保ちます。

```bash
# タスクストーリーを作成（コード、機能、バグ修正）
forloop story create \
  --title "ユーザー認証の実装" \
  --sprint 66 \
  --type basic-task \
  --priority high \
  --points 5 \
  --assignee-agent forLoopDeveloper

# ノートストーリーを作成（ドキュメント、調査、計画）
forloop story create \
  --title "アーキテクチャの決定" \
  --sprint 66 \
  --type basic-note

# ファイル整理用のドキュメントフォルダを作成（--type 不要）
forloop story create \
  --title "プロジェクトドキュメント" \
  --sprint 66

# 開発者のコメントを含むストーリー詳細を読む
forloop story get --id 229
forloop story get --id 229 --no-comments
forloop story get --id 229 --output json     # 構造化JSON出力

# ストーリーを更新
forloop story update --id 229 --status in_progress
forloop story update --id 229 --priority critical --points 8

# ストーリーを削除（--confirm が必要）
forloop story delete --id 229 --confirm
```

> **ストーリータイプの説明：** `basic-task` は実装作業用で、AIエージェントが引き受けます。`basic-note` はドキュメントやノート用です。ドキュメントフォルダはアップロードされたファイルのコンテナです。

### テンプレート操作

テンプレートはストーリーの構造を定義します。利用可能なテンプレートを一覧表示して、使用可能なストーリータイプを確認します。

```bash
forloop template list
# 組み込みテンプレート: Basic Task (basic-task), Basic Note (basic-note)
# サーバーテンプレート: Schedule Meeting (schedule-meeting), New Folder (doc-folder)

# JSON出力:
forloop template list --output json
```

### エージェント操作

ForLoopのAIエージェントと対話します——進捗の確認、新しい作業のトリガー、過去の会話の確認。

```bash
# AIエージェントが過去に議論した内容を表示
forloop agent history --sprint 66 --limit 20
forloop agent history --sprint 66 --output json

# 開発者タスクが実行中か、完了か、失敗かを確認
forloop agent developer-status --sprint 66
# 出力: "Developer Task: SUCCEEDED — Progress: 21/22 done"

# 開発者エージェントをトリガーしてストーリーの実装を開始
forloop agent developer-sprint --sprint 66
forloop agent developer-sprint --sprint 66 \
  --message "優先度の高い認証モジュールのストーリーから始めてください"
```

> **開発者スプリントをトリガーすると何が起きる？** ForLoopサーバーがAIエージェントを起動し、`todo` ストーリーを自動的に取得してコードを書き、コミットを作成し、プルリクエストを開きます。完了時にメールで通知されます。

### 組織操作

組織はスプリントをグループ化し、チームのアクセスを制御します。

```bash
# 所属している組織を一覧表示
forloop org list
forloop org list --owned-only    # 所有している組織のみ
forloop org list --output json    # 構造化JSON出力

# 組織の詳細を表示
forloop org get --id 1
forloop org get --id 1 --output json

# 組織を作成（Team または Enterprise プランが必要）
forloop org create \
  --name "エンジニアリングチーム" \
  --description "コアエンジニアリング組織"

# 組織の詳細を更新
forloop org update --id 1 --name "新しい名前"
```

### ユーザー・クォータ操作

プロファイル、制限、使用状況を確認します。

```bash
# プロファイルを表示
forloop user profile
forloop user profile --output json

# クォータの制限と現在の使用状況を確認
forloop user quotas
forloop user quotas --output json

# 特定の組織のクォータ使用状況を確認
forloop org quotas --org-id 1
forloop org quotas --org-id 1 --output json
```

### ファイル操作

スプリントストレージにファイルをアップロードし、一覧表示し、ダウンロードリンクを生成します。ファイルはS3に保存されます。

```bash
# スプリントにファイルをアップロード
forloop file upload --path ./report.pdf --sprint 66
forloop file upload --path ./mockup.png --sprint 66 --folder designs

# スプリント内のすべてのファイルを一覧表示
forloop file list --sprint 66
forloop file list --sprint 66 --output json

# ダウンロードリンクを生成
forloop file download --id 84

# ファイルを完全に削除（--confirm が必要）
forloop file delete --id 84 --confirm
```

### フォルダ操作

スプリントファイルを整理するためのドキュメントフォルダを作成します。

```bash
# チームレベルのアクセス権を持つフォルダを作成
forloop folder create \
  --title "デザインドキュメント" \
  --sprint 66 \
  --description "UIモックアップとワイヤーフレーム" \
  --permissions team
```

### 同期操作

ローカルマシン（`~/.forloop/sprint-{id}/`）とスプリントのS3ストレージ間でファイルを同期します。計画ドキュメント、タスク分解、知識ファイルをopencodeセッション間で永続化するのに役立ちます。

```bash
# ステップ1: サーバー上に同期フォルダが存在することを確認
forloop sync aivy-folder --sprint 66

# ステップ2: フォルダのストーリーIDを取得（アップロードに必要）
forloop sync aivy-doc-get --sprint 66

# ステップ3: S3からローカルマシンにスプリントファイルをダウンロード
forloop sync s3-to-local --sprint 66
forloop sync s3-to-local --sprint 66 --no-tasks --overwrite

# ステップ4: ローカルファイルをS3にアップロード
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-66/plan/my-plan.md \
  --sprint 66 \
  --folder project/plans
```

> **ローカルファイル構造：** `~/.forloop/sprint-{id}/knowledge/`、`~/.forloop/sprint-{id}/plan/`、`~/.forloop/sprint-{id}/task/`。同期コマンドはこれらのフォルダを自動的にS3パスにマッピングします。

---

## グローバルフラグ

これらのフラグはすべてのコマンドで動作します：

| フラグ | 説明 |
|------|------|
| `--api-key <key>` | このコマンドで保存されたAPIトークンを上書き |
| `--api-url <url>` | APIベースURLを上書き |
| `--output <format>` | 出力形式: `text`（デフォルト）または `json` |
| `--timeout <seconds>` | リクエストタイムアウト（秒、デフォルト: 60） |
| `--quiet` | 不要な出力を抑制——スクリプト内で便利 |
| `--verbose` | HTTPリクエスト/レスポンスの詳細を表示——デバッグに便利 |
| `--no-color` | 出力のANSIカラーを無効化 |
| `--non-interactive` | 対話的なプロンプトを無効化——CIで便利 |
| `--help` | 任意のコマンドのヘルプを表示 |
| `--version` | CLIのバージョンを表示 |

---

## 環境変数

| 変数 | 目的 |
|------|------|
| `FORLOOP_API_KEY` | APIトークン（`forloop auth login` の代替） |
| `FORLOOP_API_URL` | APIベースURLを上書き（例: `https://api.dev.forloop.cc`） |
| `FORLOOP_SPRINT_ID` | 自動検出コマンドのデフォルトスプリントID |

---

## 一般的なワークフロー

### スプリントの作業を開始する

典型的なセッション開始——コンテキストを読み込み、進捗を確認し、現在の状況を把握します。

```bash
# 1. 認証されていることを確認
forloop auth status

# 2. スプリントを見つける
forloop sprint list

# 3. 全体像を読み込む——ストーリー、ステータス、AIエージェント
forloop sprint get --id 66

# 4. 開発者エージェントは既に実行中か？
forloop agent developer-status --sprint 66

# 5. 最近のAI会話を確認してコンテキストを把握
forloop agent history --sprint 66 --limit 10

# 6. S3からファイルを同期して最新の計画を取得
forloop sync s3-to-local --sprint 66
```

### スプリントの計画と割り当て

スプリントを作成し、ストーリーを追加し、AIエージェントに実装させます。

```bash
# 1. スプリントを作成
forloop sprint create \
  --title "機能X" \
  --start-date 2026-06-09 \
  --end-date 2026-06-23

# 2. 作業をストーリーに分割
forloop story create \
  --title "プロジェクト構造のセットアップ" \
  --sprint 67 --type basic-task --priority high --points 2
forloop story create \
  --title "APIエンドポイントの構築" \
  --sprint 67 --type basic-task --priority high --points 5 --assignee-agent forLoopDeveloper
forloop story create \
  --title "UIコンポーネントの作成" \
  --sprint 67 --type basic-task --priority medium --points 3 --assignee-agent forLoopDeveloper

# 3. 計画ドキュメントをアップロード
forloop sync aivy-folder --sprint 67
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-67/plan/plan.md \
  --sprint 67 --folder project/plans

# 4. 開発者エージェントを割り当て
forloop agent developer-sprint --sprint 67

# 5. 進捗を監視
forloop agent developer-status --sprint 67
forloop sprint get --id 67
```

### ローカルとS3間のファイル同期

ローカルの計画ファイルとスプリントのS3ストレージの同期を保ちます。

```bash
# S3からすべてをダウンロード
forloop sync s3-to-local --sprint 66

# ファイルは ~/.forloop/sprint-66/knowledge/
#                ~/.forloop/sprint-66/plan/
#                ~/.forloop/sprint-66/task/ にあります

# 計画ファイルをローカルで編集
vim ~/.forloop/sprint-66/plan/my-plan.md

# S3にアップロード
forloop sync local-to-s3 \
  --path ~/.forloop/sprint-66/plan/my-plan.md \
  --sprint 66 --folder project/plans

# サーバー上にあることを確認
forloop file list --sprint 66
```

### CI/CD自動化

シェルスクリプトでCLIを使用してスプリント管理を自動化します。

```bash
#!/bin/bash
set -e

# 環境変数で認証
export FORLOOP_API_KEY="$FORLOOP_TOKEN"

# 開発者タスクが既に実行中か確認
STATUS=$(forloop agent developer-status --sprint "$SPRINT_ID")
echo "$STATUS"

# アクティブなタスクがない場合、新しい開発者スプリントをトリガー
if echo "$STATUS" | grep -q "No active"; then
  forloop agent developer-sprint \
    --sprint "$SPRINT_ID" \
    --message "CIトリガーによる実装"
fi

# 完了を待つ（60秒ごとにポーリング）
while forloop agent developer-status --sprint "$SPRINT_ID" | grep -q "RUNNING"; do
  echo "まだ実行中..."
  sleep 60
done

echo "スプリント $SPRINT_ID が完了しました。"
```

---

## 設定

CLIは以下の優先順位でこれらのソースから設定を解決します：

```
1. 環境変数（最優先）
2. プロジェクト設定（./opencode.json の "forloop" キー）
3. グローバル設定（~/.config/opencode/config.json）
4. デフォルト（本番API）
```

### プロジェクト設定（`./opencode.json`）

```json
{
  "forloop": {
    "apiUrl": "https://api.forloop.cc"
  }
}
```

### グローバル設定（`~/.config/opencode/config.json`）

```json
{
  "forloop": {
    "apiUrl": "https://api.forloop.cc"
  }
}
```

### トークンストレージ

APIトークンは `~/.config/forloop/tokens.json` に制限付きパーミッション（`chmod 600`）で保存されます。このファイルはForLoop専用で、他のツールと共有されません。

---

## トラブルシューティング

### "No ForLoop API key configured"

認証が必要です：

```bash
forloop auth login --api-key floop_xxxxx
# または
export FORLOOP_API_KEY=floop_xxxxx
```

### "Invalid token format"

トークンは `floop_` で始まる必要があります。https://forloop.cc/profile?tab=api-tokens から完全なトークンをコピーしたか再確認してください。

### 特定のリソースで "Forbidden" または "Not Found"

一部のリソース（組織、ストーリー、ファイル）は、アクセス権がないか現在の環境に存在しない場合に403/404を返します。以下をお試しください：
- `forloop sprint get --id <id>` でリソースIDの存在を確認
- トークンに必要なスコープがあるか確認

### 詳細なデバッグ

何かが動作しない場合は、`--verbose` を使用して生のHTTPリクエストを確認します：

```bash
forloop sprint get --id 66 --verbose
# 出力:
# > GET https://api.forloop.cc/api/opencode/sprints/66
# < 200 OK
```

---

## ライセンス

MIT
