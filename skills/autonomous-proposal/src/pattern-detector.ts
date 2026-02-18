/**
 * パターン検出エンジン (#55)
 *
 * 機能:
 * - 繰り返しパターン検出（3回以上）
 * - 複雑度判定（5ステップ以上）
 * - エラーパターン検出（3回以上）
 */

export interface Pattern {
  type: 'repetition' | 'complexity' | 'error';
  description: string;
  count: number;
  threshold: number;
  data: any;
  detectedAt: Date;
  relatedTasks?: Task[];
  relatedErrors?: ErrorLog[];
}

export interface Task {
  name: string;
  description: string;
  steps: string[];
  executedAt: Date;
  timestamp: Date;
}

export interface ErrorLog {
  type: string;
  message: string;
  stackTrace?: string;
  occurredAt: Date;
  timestamp: Date;
  context?: string;
}

export class PatternDetector {
  private taskHistory: Task[] = [];
  private errorHistory: ErrorLog[] = [];
  private repetitionThreshold: number;
  private complexityThreshold: number;
  private errorThreshold: number;

  constructor(
    repetitionThreshold = 3,
    complexityThreshold = 5,
    errorThreshold = 3
  ) {
    this.repetitionThreshold = repetitionThreshold;
    this.complexityThreshold = complexityThreshold;
    this.errorThreshold = errorThreshold;
  }

  /**
   * タスクを記録
   */
  recordTask(task: Task): void {
    this.taskHistory.push(task);
  }

  /**
   * エラーを記録
   */
  recordError(error: ErrorLog): void {
    this.errorHistory.push(error);
  }

  /**
   * 繰り返しパターンを検出（3回以上）
   */
  detectRepetition(): Pattern[] {
    const patterns: Pattern[] = [];
    const taskCounts = new Map<string, number>();
    const taskDetails = new Map<string, Task[]>();

    // タスク名でグループ化
    this.taskHistory.forEach(task => {
      const normalizedName = this.normalizeTaskName(task.name);
      const count = taskCounts.get(normalizedName) || 0;
      taskCounts.set(normalizedName, count + 1);

      if (!taskDetails.has(normalizedName)) {
        taskDetails.set(normalizedName, []);
      }
      taskDetails.get(normalizedName)!.push(task);
    });

    // 閾値を超えたタスクをパターンとして抽出
    taskCounts.forEach((count, name) => {
      if (count >= this.repetitionThreshold) {
        patterns.push({
          type: 'repetition',
          description: `タスク "${name}" が ${count} 回繰り返されました`,
          count,
          threshold: this.repetitionThreshold,
          data: {
            taskName: name,
            tasks: taskDetails.get(name),
          },
          detectedAt: new Date(),
          relatedTasks: taskDetails.get(name),
        });
      }
    });

    return patterns;
  }

  /**
   * 複雑度を判定（5ステップ以上）
   */
  detectComplexity(): Pattern[] {
    const patterns: Pattern[] = [];

    this.taskHistory.forEach(task => {
      const stepCount = task.steps.length;

      if (stepCount >= this.complexityThreshold) {
        patterns.push({
          type: 'complexity',
          description: `タスク "${task.name}" は ${stepCount} ステップを必要とします`,
          count: stepCount,
          threshold: this.complexityThreshold,
          data: {
            taskName: task.name,
            steps: task.steps,
            executedAt: task.executedAt,
          },
          detectedAt: new Date(),
          relatedTasks: [task],
        });
      }
    });

    return patterns;
  }

  /**
   * エラーパターンを検出（3回以上）
   */
  detectErrorPattern(): Pattern[] {
    const patterns: Pattern[] = [];
    const errorCounts = new Map<string, number>();
    const errorDetails = new Map<string, ErrorLog[]>();

    // エラーメッセージでグループ化
    this.errorHistory.forEach(error => {
      const normalizedMessage = this.normalizeErrorMessage(error.message);
      const count = errorCounts.get(normalizedMessage) || 0;
      errorCounts.set(normalizedMessage, count + 1);

      if (!errorDetails.has(normalizedMessage)) {
        errorDetails.set(normalizedMessage, []);
      }
      errorDetails.get(normalizedMessage)!.push(error);
    });

    // 閾値を超えたエラーをパターンとして抽出
    errorCounts.forEach((count, message) => {
      if (count >= this.errorThreshold) {
        patterns.push({
          type: 'error',
          description: `エラー "${message}" が ${count} 回発生しました`,
          count,
          threshold: this.errorThreshold,
          data: {
            errorMessage: message,
            errors: errorDetails.get(message),
          },
          detectedAt: new Date(),
          relatedErrors: errorDetails.get(message),
        });
      }
    });

    return patterns;
  }

  /**
   * 全てのパターンを検出
   */
  detectAll(): Pattern[] {
    return [
      ...this.detectRepetition(),
      ...this.detectComplexity(),
      ...this.detectErrorPattern(),
    ];
  }

  /**
   * スキル化を推奨すべきパターンがあるか判定
   */
  shouldProposeSkill(): boolean {
    const patterns = this.detectAll();
    return patterns.length > 0;
  }

  /**
   * タスク名を正規化（類似タスクを同じグループにまとめる）
   */
  private normalizeTaskName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\d+/g, 'X') // 数字をXに置換
      .replace(/\s+/g, ' ') // 連続スペースを1つに
      .trim();
  }

  /**
   * エラーメッセージを正規化
   */
  private normalizeErrorMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/file:\/\/[^\s]+/g, 'FILE_PATH') // ファイルパスを置換
      .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE') // 日付を置換
      .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME') // 時刻を置換
      .trim();
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalTasks: number;
    totalErrors: number;
    uniqueTasks: number;
    uniqueErrors: number;
  } {
    const uniqueTasks = new Set(
      this.taskHistory.map(t => this.normalizeTaskName(t.name))
    ).size;
    const uniqueErrors = new Set(
      this.errorHistory.map(e => this.normalizeErrorMessage(e.message))
    ).size;

    return {
      totalTasks: this.taskHistory.length,
      totalErrors: this.errorHistory.length,
      uniqueTasks,
      uniqueErrors,
    };
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.taskHistory = [];
    this.errorHistory = [];
  }
}
