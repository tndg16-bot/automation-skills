/**
 * PatternDetector 動作確認テスト
 * Issue #55 の受入条件を検証
 */

const { PatternDetector } = require('./dist/pattern-detector.js');

console.log('=== PatternDetector 動作確認テスト ===\n');

const detector = new PatternDetector(3, 5, 3);

// テスト1: 繰り返しパターン検出（3回以上）
console.log('テスト1: 繰り返しパターン検出');
detector.recordTask({
  name: 'メール送信',
  description: '顧客へのメール送信',
  steps: ['メール作成', '送信'],
  executedAt: new Date(),
  timestamp: new Date(),
});
detector.recordTask({
  name: 'メール送信',
  description: '顧客へのメール送信',
  steps: ['メール作成', '送信'],
  executedAt: new Date(),
  timestamp: new Date(),
});
detector.recordTask({
  name: 'メール送信',
  description: '顧客へのメール送信',
  steps: ['メール作成', '送信'],
  executedAt: new Date(),
  timestamp: new Date(),
});

const repetitionPatterns = detector.detectRepetition();
console.log(`  結果: ${repetitionPatterns.length} 個の繰り返しパターンを検出`);
if (repetitionPatterns.length > 0) {
  console.log(`  ✓ ${repetitionPatterns[0].description}`);
}

// テスト2: 複雑度判定（5ステップ以上）
console.log('\nテスト2: 複雑度判定');
detector.recordTask({
  name: 'レポート作成',
  description: '月次レポートの作成',
  steps: [
    'データ収集',
    'データ分析',
    'グラフ作成',
    'レポート執筆',
    'レビュー依頼',
    '修正',
    '提出',
  ],
  executedAt: new Date(),
  timestamp: new Date(),
});

const complexityPatterns = detector.detectComplexity();
console.log(`  結果: ${complexityPatterns.length} 個の複雑なタスクを検出`);
if (complexityPatterns.length > 0) {
  console.log(`  ✓ ${complexityPatterns[0].description}`);
}

// テスト3: エラーパターン検出（3回以上）
console.log('\nテスト3: エラーパターン検出');
detector.recordError({
  type: 'NetworkError',
  message: 'API接続エラー: timeout at https://api.example.com/v1/users',
  occurredAt: new Date(),
  timestamp: new Date(),
});
detector.recordError({
  type: 'NetworkError',
  message: 'API接続エラー: timeout at https://api.example.com/v1/posts',
  occurredAt: new Date(),
  timestamp: new Date(),
});
detector.recordError({
  type: 'NetworkError',
  message: 'API接続エラー: timeout at https://api.example.com/v1/comments',
  occurredAt: new Date(),
  timestamp: new Date(),
});

const errorPatterns = detector.detectErrorPattern();
console.log(`  結果: ${errorPatterns.length} 個のエラーパターンを検出`);
if (errorPatterns.length > 0) {
  console.log(`  ✓ ${errorPatterns[0].description}`);
}

// テスト4: 全パターン検出
console.log('\nテスト4: 全パターン検出');
const allPatterns = detector.detectAll();
console.log(`  結果: ${allPatterns.length} 個のパターンを検出`);
console.log(`  ✓ shouldProposeSkill(): ${detector.shouldProposeSkill()}`);

// テスト5: 統計情報
console.log('\nテスト5: 統計情報');
const stats = detector.getStats();
console.log(`  総タスク数: ${stats.totalTasks}`);
console.log(`  総エラー数: ${stats.totalErrors}`);
console.log(`  ユニークタスク: ${stats.uniqueTasks}`);
console.log(`  ユニークエラー: ${stats.uniqueErrors}`);

console.log('\n=== テスト完了 ===');
