/**
 * 自律提案システム - メインエントリーポイント
 *
 * 機能:
 * 1. パターン検出 (#55)
 * 2. ログ収集 (#56)
 * 3. スキル生成テンプレート (#57)
 * 4. 提案通知 (#58)
 * 5. 承認フロー (#59)
 */

import { PatternDetector, Pattern, Task, ErrorLog } from './pattern-detector';
import { LogCollector } from './log-collector';
import { SkillGenerator, SkillConfig, GeneratedSkill } from './skill-generator';
import { ProposalNotifier, NotificationConfig } from './notification';

export interface Proposal {
  id: string;
  pattern: Pattern;
  skillConfig: SkillConfig;
  generatedSkill?: GeneratedSkill;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface AutonomousProposalConfig {
  skillsDir: string;
  obsidianVaultPath?: string;
  discordChannels?: string[];
  githubRepos?: string[];
  autoGenerate?: boolean;
  notification?: NotificationConfig;
}

export class AutonomousProposal {
  private config: AutonomousProposalConfig;
  private detector: PatternDetector;
  private collector: LogCollector;
  private generator: SkillGenerator;
  private notifier?: ProposalNotifier;
  private proposals: Proposal[] = [];

  constructor(config: AutonomousProposalConfig) {
    this.config = config;
    this.detector = new PatternDetector();
    this.collector = new LogCollector({
      discordChannels: config.discordChannels,
      obsidianVaultPath: config.obsidianVaultPath,
      githubRepos: config.githubRepos,
    });
    this.generator = new SkillGenerator(config.skillsDir);

    if (config.notification) {
      this.notifier = new ProposalNotifier(config.notification);
    }
  }

  /**
   * メイン実行メソッド
   */
  async run(): Promise<Proposal[]> {
    console.log('🔍 自律提案システム開始');

    // 1. ログ収集
    console.log('📊 ログ収集中...');
    const { tasks, errors } = await this.collector.collectAll();

    // 2. ログをパターン検出器に記録
    console.log('📝 タスクとエラーを記録中...');
    tasks.forEach(task => this.detector.recordTask(task));
    errors.forEach(error => this.detector.recordError(error));

    // 3. パターン検出
    console.log('🔍 パターン検出中...');
    const patterns = this.detector.detectAll();

    if (patterns.length === 0) {
      console.log('✅ 検出されたパターンはありません');
      return [];
    }

    console.log(`✨ ${patterns.length} 個のパターンを検出しました`);

    // 4. 各パターンからスキル候補を生成
    for (const pattern of patterns) {
      const proposal = await this.createProposal(pattern);
      this.proposals.push(proposal);

      if (this.config.autoGenerate) {
        await this.generateSkill(proposal);
      }
    }

    // 5. 提案をDiscordに通知 (#58)
    if (this.notifier && this.proposals.length > 0) {
      console.log('📢 提案をDiscordに通知中...');
      await this.notifier.notifyProposals(this.proposals);
    }

    // 6. 統計情報を表示
    const stats = this.detector.getStats();
    console.log('\n📊 統計情報:');
    console.log(`  - 総タスク数: ${stats.totalTasks}`);
    console.log(`  - 総エラー数: ${stats.totalErrors}`);
    console.log(`  - ユニークタスク: ${stats.uniqueTasks}`);
    console.log(`  - ユニークエラー: ${stats.uniqueErrors}`);

    return this.proposals;
  }

  /**
   * パターンから提案を作成
   */
  private async createProposal(pattern: Pattern): Promise<Proposal> {
    const skillConfig = this.patternToSkillConfig(pattern);

    return {
      id: `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pattern,
      skillConfig,
      status: 'pending',
      createdAt: new Date(),
    };
  }

  /**
   * パターンからスキル設定を生成
   */
  private patternToSkillConfig(pattern: Pattern): SkillConfig {
    const baseName = this.generateSkillName(pattern);

    return {
      name: baseName,
      description: this.generateDescription(pattern),
      features: this.generateFeatures(pattern),
      version: '1.0.0',
      hasCron: true,
      hasConfig: true,
    };
  }

  /**
   * スキル名を生成
   */
  private generateSkillName(pattern: Pattern): string {
    const typeMap = {
      repetition: 'auto-task',
      complexity: 'complex-task',
      error: 'error-handler',
    };

    const base = typeMap[pattern.type] || 'auto-skill';
    return `${base}-${Date.now()}`;
  }

  /**
   * 説明を生成
   */
  private generateDescription(pattern: Pattern): string {
    return pattern.description;
  }

  /**
   * 機能リストを生成
   */
  private generateFeatures(pattern: Pattern): string[] {
    const features: string[] = [];

    switch (pattern.type) {
      case 'repetition':
        features.push('繰り返しタスクの自動化');
        features.push('タスク実行のスケジュール設定');
        features.push('実行履歴の追跡');
        break;

      case 'complexity':
        features.push('複雑なワークフローの自動化');
        features.push('ステップごとの実行管理');
        features.push('エラーハンドリング');
        break;

      case 'error':
        features.push('エラーの自動検出');
        features.push('修復アクションの実行');
        features.push('エラーログの記録');
        break;
    }

    return features;
  }

  /**
   * スキルを生成
   */
  async generateSkill(proposal: Proposal): Promise<GeneratedSkill | undefined> {
    try {
      console.log(`🔨 スキル生成中: ${proposal.skillConfig.name}`);
      const generatedSkill = await this.generator.generate(proposal.skillConfig);
      proposal.generatedSkill = generatedSkill;
      console.log(`✅ スキル生成完了: ${generatedSkill.path}`);
      return generatedSkill;
    } catch (error) {
      console.error('❌ スキル生成エラー:', error);
      return undefined;
    }
  }

  /**
   * 提案を承認
   */
  approveProposal(proposalId: string): boolean {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) return false;

    proposal.status = 'approved';
    console.log(`✅ 提案を承認しました: ${proposalId}`);
    return true;
  }

  /**
   * 提案を拒否
   */
  rejectProposal(proposalId: string): boolean {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) return false;

    proposal.status = 'rejected';
    console.log(`❌ 提案を拒否しました: ${proposalId}`);
    return true;
  }

  /**
   * 保留中の提案を取得
   */
  getPendingProposals(): Proposal[] {
    return this.proposals.filter(p => p.status === 'pending');
  }

  /**
   * 全ての提案を取得
   */
  getAllProposals(): Proposal[] {
    return this.proposals;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<AutonomousProposalConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.discordChannels || config.obsidianVaultPath || config.githubRepos) {
      this.collector.updateConfig({
        discordChannels: config.discordChannels,
        obsidianVaultPath: config.obsidianVaultPath,
        githubRepos: config.githubRepos,
      });
    }
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.detector.clear();
    this.proposals = [];
  }
}

export default AutonomousProposal;

// 関連する型とクラスを再エクスポート
export { PatternDetector, Pattern, Task, ErrorLog } from './pattern-detector';
export { LogCollector, DiscordLog, DiscordMessage, ObsidianNote, GitHubIssue } from './log-collector';
export { SkillGenerator, SkillConfig, GeneratedSkill } from './skill-generator';
export { ProposalNotifier, NotificationConfig, NotificationMessage, NotificationField } from './notification';
