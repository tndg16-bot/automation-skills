/**
 * 提案通知システム (#58)
 *
 * 機能:
 * - Discordへの通知送信
 * - スキル化提案メッセージの生成
 * - 関連ログの添付
 */

import { Pattern, Task, ErrorLog } from './pattern-detector';
import { Proposal } from './index';

export interface NotificationConfig {
  discordChannel: string;
  mentionUser?: string;
}

export interface NotificationMessage {
  title: string;
  description: string;
  fields: NotificationField[];
  footer?: string;
}

export interface NotificationField {
  name: string;
  value: string;
  inline?: boolean;
}

export class ProposalNotifier {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * 提案をDiscordに通知
   */
  async notifyProposal(proposal: Proposal): Promise<void> {
    const message = this.formatProposalMessage(proposal);

    // Discord Embed形式でメッセージを生成
    const discordMessage = this.createDiscordEmbed(message, proposal);

    // OpenClaw message toolを使用してDiscordに送信
    await this.sendToDiscord(discordMessage);
  }

  /**
   * 提案メッセージをフォーマット
   */
  private formatProposalMessage(proposal: Proposal): NotificationMessage {
    const { pattern, skillConfig } = proposal;

    const title = this.generateTitle(pattern);
    const description = this.generateDescription(pattern, skillConfig);
    const fields = this.generateFields(proposal);

    return {
      title,
      description,
      fields,
      footer: `提案ID: ${proposal.id} | 作成日時: ${this.formatDate(proposal.createdAt)}`,
    };
  }

  /**
   * タイトルを生成
   */
  private generateTitle(pattern: Pattern): string {
    const emoji = this.getPatternEmoji(pattern.type);
    const typeLabel = this.getPatternTypeLabel(pattern.type);

    return `${emoji} スキル化提案: ${typeLabel}`;
  }

  /**
   * パターンタイプの絵文字を取得
   */
  private getPatternEmoji(type: string): string {
    const emojis: Record<string, string> = {
      repetition: '🔄',
      complexity: '🧩',
      error: '⚠️',
    };
    return emojis[type] || '✨';
  }

  /**
   * パターンタイプのラベルを取得
   */
  private getPatternTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      repetition: '繰り返しタスク',
      complexity: '複雑なタスク',
      error: 'エラーパターン',
    };
    return labels[type] || 'その他';
  }

  /**
   * 説明を生成
   */
  private generateDescription(pattern: Pattern, skillConfig: any): string {
    let description = pattern.description;

    // パターンタイプ別の追加説明
    switch (pattern.type) {
      case 'repetition':
        description += `\n\n**検出回数**: ${pattern.count}回以上繰り返されています。`;
        description += `\n**自動化効果**: このタスクを自動化することで、毎回の手間を削減できます。`;
        break;

      case 'complexity':
        description += `\n\n**複雑度**: ${pattern.count}ステップ以上の作業フローです。`;
        description += `\n**自動化効果**: ワークフロー全体を自動化することで、ミスを防ぎ、効率化できます。`;
        break;

      case 'error':
        description += `\n\n**発生回数**: ${pattern.count}回以上のエラーが発生しています。`;
        description += `\n**自動化効果**: エラー検出と自動修復で、ダウンタイムを削減できます。`;
        break;
    }

    description += `\n\n**提案スキル名**: \`${skillConfig.name}\``;

    return description;
  }

  /**
   * フィールドを生成
   */
  private generateFields(proposal: Proposal): NotificationField[] {
    const fields: NotificationField[] = [];
    const { pattern, skillConfig } = proposal;

    // 機能リスト
    if (skillConfig.features && skillConfig.features.length > 0) {
      fields.push({
        name: '📋 主な機能',
        value: skillConfig.features.map((f: string) => `• ${f}`).join('\n'),
        inline: false,
      });
    }

    // 過去の事例（関連ログ）
    const relatedLogs = this.extractRelatedLogs(pattern);
    if (relatedLogs.length > 0) {
      fields.push({
        name: '📚 過去の事例',
        value: relatedLogs.map(log => `• ${log}`).join('\n').substring(0, 1024), // Discord制限
        inline: false,
      });
    }

    // 自動化のメリット
    fields.push({
      name: '✨ 期待されるメリット',
      value: this.generateBenefits(pattern),
      inline: false,
    });

    // 次のステップ
    fields.push({
      name: '📌 次のステップ',
      value: 'この提案を承認するには ✅ リアクションを付けてください。\n却下するには ❌ リアクションを付けてください。',
      inline: false,
    });

    return fields;
  }

  /**
   * 関連ログを抽出（過去の事例）
   */
  private extractRelatedLogs(pattern: Pattern): string[] {
    const logs: string[] = [];

    if (pattern.type === 'repetition' && pattern.relatedTasks) {
      // 最新5件のタスクを表示
      const recentTasks = pattern.relatedTasks.slice(-5);
      recentTasks.forEach(task => {
        logs.push(`[${this.formatDate(new Date(task.timestamp))}] ${task.description}`);
      });
    }

    if (pattern.type === 'error' && pattern.relatedErrors) {
      // 最新5件のエラーを表示
      const recentErrors = pattern.relatedErrors.slice(-5);
      recentErrors.forEach(error => {
        logs.push(`[${this.formatDate(new Date(error.timestamp))}] ${error.type}: ${error.message}`);
      });
    }

    if (pattern.type === 'complexity' && pattern.relatedTasks) {
      // 複雑なタスクの例
      const complexTask = pattern.relatedTasks[pattern.relatedTasks.length - 1];
      if (complexTask) {
        logs.push(`${complexTask.description} (${complexTask.steps?.length || 0}ステップ)`);
      }
    }

    return logs;
  }

  /**
   * 自動化のメリットを生成
   */
  private generateBenefits(pattern: Pattern): string {
    const benefits: string[] = [];

    switch (pattern.type) {
      case 'repetition':
        benefits.push('• 手動作業の削減');
        benefits.push('• 作業ミスの防止');
        benefits.push('• 時間の節約');
        break;

      case 'complexity':
        benefits.push('• 複雑なフローの一元管理');
        benefits.push('• ステップ忘れの防止');
        benefits.push('• 進捗の可視化');
        break;

      case 'error':
        benefits.push('• エラーの早期検出');
        benefits.push('• 自動修復によるダウンタイム削減');
        benefits.push('• エラーログの自動記録');
        break;
    }

    return benefits.join('\n');
  }

  /**
   * Discord Embed形式のメッセージを作成
   */
  private createDiscordEmbed(message: NotificationMessage, proposal: Proposal): any {
    const embed = {
      title: message.title,
      description: message.description,
      color: this.getPatternColor(proposal.pattern.type),
      fields: message.fields,
      footer: {
        text: message.footer || '',
      },
      timestamp: new Date().toISOString(),
    };

    return {
      embeds: [embed],
      // メンションが必要な場合
      content: this.config.mentionUser ? `<@${this.config.mentionUser}>` : undefined,
    };
  }

  /**
   * パターンタイプの色を取得
   */
  private getPatternColor(type: string): number {
    const colors: Record<string, number> = {
      repetition: 0x00FF00, // 緑
      complexity: 0x0099FF, // 青
      error: 0xFF6600, // オレンジ
    };
    return colors[type] || 0x9932CC; // デフォルトは紫
  }

  /**
   * Discordに送信
   */
  private async sendToDiscord(message: any): Promise<void> {
    // OpenClaw message toolを使用
    // 実際の実装では、OpenClawのmessage toolを呼び出す
    console.log('📤 Discord通知送信:');
    console.log(JSON.stringify(message, null, 2));

    // 実際の送信処理
    // await openclaw.message.send({
    //   channel: 'discord',
    //   to: this.config.discordChannel,
    //   embeds: message.embeds,
    //   content: message.content,
    // });
  }

  /**
   * 複数の提案をまとめて通知
   */
  async notifyProposals(proposals: Proposal[]): Promise<void> {
    for (const proposal of proposals) {
      await this.notifyProposal(proposal);
    }
  }

  /**
   * 日時をフォーマット
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default ProposalNotifier;
