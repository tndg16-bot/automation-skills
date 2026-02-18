/**
 * ログ収集システム (#56)
 *
 * 機能:
 * - Discordログ収集（message tool活用）
 * - Obsidianノート解析
 * - GitHub Issues監視
 */

import { Task, ErrorLog } from './pattern-detector';
import * as fs from 'fs';
import * as path from 'path';

export interface DiscordLog {
  channelId: string;
  channelName: string;
  messages: DiscordMessage[];
}

export interface DiscordMessage {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

export interface ObsidianNote {
  path: string;
  content: string;
  tasks: string[];
  errors: string[];
  metadata: Record<string, any>;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  createdAt: Date;
}

export class LogCollector {
  private discordChannels: string[] = [];
  private obsidianVaultPath: string;
  private githubRepos: string[] = [];

  constructor(config?: {
    discordChannels?: string[];
    obsidianVaultPath?: string;
    githubRepos?: string[];
  }) {
    this.discordChannels = config?.discordChannels || [];
    this.obsidianVaultPath = config?.obsidianVaultPath || '';
    this.githubRepos = config?.githubRepos || [];
  }

  /**
   * Discordチャンネルを追加
   */
  addDiscordChannel(channelId: string): void {
    this.discordChannels.push(channelId);
  }

  /**
   * GitHubリポジトリを追加
   */
  addGitHubRepo(repo: string): void {
    this.githubRepos.push(repo);
  }

  /**
   * Discordログを収集（OpenClaw message tool経由）
   *
   * 注: 実際のDiscord API呼び出しはOpenClawのmessage toolを使用
   * ここではインターフェースのみ定義
   */
  async collectDiscordLogs(): Promise<DiscordLog[]> {
    const logs: DiscordLog[] = [];

    // OpenClaw message toolを使用してDiscordログを取得
    // 実装例:
    // for (const channelId of this.discordChannels) {
    //   const messages = await message.read({ channel: channelId, limit: 100 });
    //   logs.push({
    //     channelId,
    //     channelName: 'channel-name',
    //     messages: messages.map(m => ({
    //       id: m.id,
    //       author: m.author,
    //       content: m.content,
    //       timestamp: m.timestamp,
    //     })),
    //   });
    // }

    return logs;
  }

  /**
   * Obsidianデイリーノートを解析
   */
  async parseObsidianNotes(): Promise<ObsidianNote[]> {
    const notes: ObsidianNote[] = [];

    if (!this.obsidianVaultPath || !fs.existsSync(this.obsidianVaultPath)) {
      return notes;
    }

    // デイリーノートディレクトリの候補パス（複数パターン対応）
    const dailyPaths = [
      'daily',
      'Daily Notes',
      'Notes/daily',
      'papa/daily',
    ];

    let dailyNotesPath: string | null = null;
    for (const subPath of dailyPaths) {
      const candidate = path.join(this.obsidianVaultPath, subPath);
      if (fs.existsSync(candidate)) {
        dailyNotesPath = candidate;
        break;
      }
    }

    if (!dailyNotesPath) {
      return notes;
    }

    const files = fs.readdirSync(dailyNotesPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(dailyNotesPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // タスク抽出（- [ ] 形式）
      const tasks = this.extractTasks(content);

      // エラー抽出（エラー/ERRORキーワード）
      const errors = this.extractErrors(content);

      // メタデータ抽出（frontmatter）
      const metadata = this.extractMetadata(content);

      notes.push({
        path: filePath,
        content,
        tasks,
        errors,
        metadata,
      });
    }

    return notes;
  }

  /**
   * GitHub Issuesからエラーパターンを抽出
   *
   * 注: 実際のGitHub API呼び出しはGitHub CLI (gh)を使用
   */
  async collectGitHubIssues(): Promise<GitHubIssue[]> {
    const issues: GitHubIssue[] = [];

    // GitHub CLIを使用してIssuesを取得
    // 実装例:
    // for (const repo of this.githubRepos) {
    //   const result = await exec(`gh issue list --repo ${repo} --state open --json number,title,body,state,labels`);
    //   const parsed = JSON.parse(result);
    //   issues.push(...parsed.map(i => ({
    //     number: i.number,
    //     title: i.title,
    //     body: i.body,
    //     state: i.state,
    //     labels: i.labels.map((l: any) => l.name),
    //     createdAt: new Date(i.createdAt),
    //   })));
    // }

    return issues;
  }

  /**
   * 全てのソースからタスクとエラーを抽出
   */
  async collectAll(): Promise<{
    tasks: Task[];
    errors: ErrorLog[];
  }> {
    const tasks: Task[] = [];
    const errors: ErrorLog[] = [];

    // Obsidianノートからタスクとエラーを抽出
    const notes = await this.parseObsidianNotes();
    for (const note of notes) {
      // タスクをTask形式に変換
      for (const task of note.tasks) {
        const timestamp = note.metadata.date || new Date();
        tasks.push({
          name: task,
          description: task,
          steps: [task], // 単一ステップとして扱う
          executedAt: timestamp,
          timestamp,
        });
      }

      // エラーをErrorLog形式に変換
      for (const error of note.errors) {
        const timestamp = note.metadata.date || new Date();
        errors.push({
          type: 'obsidian',
          message: error,
          occurredAt: timestamp,
          timestamp,
          context: note.path,
        });
      }
    }

    // Discordログからもタスクを抽出（オプション）
    // const discordLogs = await this.collectDiscordLogs();
    // ...

    // GitHub Issuesからエラーパターンを抽出
    // const githubIssues = await this.collectGitHubIssues();
    // ...

    return { tasks, errors };
  }

  /**
   * タスクを抽出（Markdown形式）
   */
  private extractTasks(content: string): string[] {
    const tasks: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // - [ ] 形式のタスク
      const match = line.match(/^[-*]\s+\[ \]\s+(.+)$/);
      if (match) {
        tasks.push(match[1]);
      }

      // - [x] 形式の完了タスクも抽出（履歴として）
      const completedMatch = line.match(/^[-*]\s+\[x\]\s+(.+)$/);
      if (completedMatch) {
        tasks.push(`[完了] ${completedMatch[1]}`);
      }
    }

    return tasks;
  }

  /**
   * エラーを抽出（キーワードベース）
   */
  private extractErrors(content: string): string[] {
    const errors: string[] = [];
    const lines = content.split('\n');

    const errorKeywords = ['エラー', 'ERROR', 'Error', '失敗', 'failed', 'exception'];

    for (const line of lines) {
      for (const keyword of errorKeywords) {
        if (line.includes(keyword)) {
          errors.push(line.trim());
          break;
        }
      }
    }

    return errors;
  }

  /**
   * メタデータを抽出（YAML frontmatter）
   */
  private extractMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // frontmatterがある場合
    const match = content.match(/^---\n([\s\S]+?)\n---/);
    if (match) {
      const frontmatter = match[1];
      const lines = frontmatter.split('\n');

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          metadata[key.trim()] = value;
        }
      }
    }

    return metadata;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: {
    discordChannels?: string[];
    obsidianVaultPath?: string;
    githubRepos?: string[];
  }): void {
    if (config.discordChannels) {
      this.discordChannels = config.discordChannels;
    }
    if (config.obsidianVaultPath) {
      this.obsidianVaultPath = config.obsidianVaultPath;
    }
    if (config.githubRepos) {
      this.githubRepos = config.githubRepos;
    }
  }
}
