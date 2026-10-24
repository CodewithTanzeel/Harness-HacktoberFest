export interface ProviderInfo {
  id: string;
  name: string;
  model: string;
  isAvailable: boolean;
  description: string;
  recommended: boolean;
}

export interface SampleModule {
  filename: string;
  path: string;
  moduleName: string;
  content: string;
  byteSize: number;
}

export interface AstSymbolFunction {
  name: string;
  lineno: number;
  args: string[];
}

export interface AstSymbolClass {
  name: string;
  lineno: number;
}

export interface AstInspection {
  isValid: boolean;
  error?: string;
  lineno?: number;
  imports: string[];
  functions: AstSymbolFunction[];
  classes: AstSymbolClass[];
}

export interface TestCaseResult {
  name: string;
  class_name: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  duration_ms: number;
  failure_message?: string | null;
  traceback?: string | null;
  stdout?: string | null;
}

export interface TestRunReport {
  run_id: string;
  timestamp: number;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  duration_ms: number;
  exit_code: number;
  test_cases: TestCaseResult[];
  junit_xml: string;
  raw_stdout: string;
  raw_stderr: string;
  is_success?: boolean;
}

export interface FailureDiagnosis {
  category: 'syntax' | 'import_hallucination' | 'assertion_failure' | 'fixture_missing' | 'timeout' | 'runtime_exception';
  summary: string;
  root_cause_test?: string | null;
  raw_error?: string | null;
  suggested_fix?: string | null;
}

export interface RepairAttempt {
  attempt_number: number;
  diagnosis: FailureDiagnosis;
  original_code: string;
  repaired_code: string;
  syntax_valid: boolean;
  report_after_repair?: TestRunReport | null;
  success: boolean;
}

export interface RunRecord {
  id: string;
  timestamp: number;
  target_filename: string;
  target_code: string;
  module_name: string;
  provider_name: string;
  initial_test_code: string;
  final_test_code: string;
  status: 'passed' | 'repaired' | 'failed' | 'syntax_error' | 'timeout';
  initial_report?: TestRunReport | null;
  final_report?: TestRunReport | null;
  repair_history: RepairAttempt[];
  was_repaired: boolean;
  total_duration_ms: number;
}

export interface RunSummary {
  id: string;
  timestamp: number;
  target_filename: string;
  module_name: string;
  provider_name: string;
  status: string;
  was_repaired: boolean;
  passed: number;
  total: number;
  duration_ms: number;
}

export type PipelineStage =
  | 'idle'
  | 'analyzing'
  | 'generating'
  | 'ast_validation'
  | 'executing'
  | 'diagnosing'
  | 'repairing'
  | 'storing'
  | 'complete';
