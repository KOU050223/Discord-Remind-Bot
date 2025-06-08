# 進捗どうですか？BOT

Discordの特定のスレッドに対して進捗を確認しに来るボットです

# コマンド

| コマンド名           | 説明                                             |
|----------------------|--------------------------------------------------|
| /set-schedule <cron> | 通知のcronスケジュールを設定します（例: 0 0 */2 * *）|
| /change-message <msg>| 通知メッセージを変更します                        |
| /add-thread <thread_id>   | 通知先スレッドを追加します                        |
| /delete-thread <thread_id>| 通知先スレッドを削除します                        |

- cron式は日本時間（Asia/Tokyo）で動作します。
- 例: `/set-schedule 0 0 * * *` → 毎日00:00に通知

# 参考記事

[【Koyeb】Discord BOTを無料で24時間稼働させる](https://zenn.dev/saitogo/articles/e763dad351594f)

# 関連リンク

[Koyeb](https://app.koyeb.com/)

[Discord.dev](https://discord.com/developers/applications)