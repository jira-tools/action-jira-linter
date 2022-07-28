/** Hidden marker to add to PR description. */
export const HIDDEN_MARKER = 'added_by_jira_lint';

/** Regex to check for the hidden marker in PR description to avoid adding action-jira-linter PR details
 * multiple times. */
export const MARKER_REGEX = new RegExp(HIDDEN_MARKER);

/**
 * Bot branch patters to avoid running action-jira-linter on.
 */
export const BOT_BRANCH_PATTERNS: RegExp[] = [/^dependabot/, /^all-contributors/];

/**
 * Default branch patterms to skip CI. Skip action-jira-linter when the HEAD ref matches one of these.
 */
export const DEFAULT_BRANCH_PATTERNS: RegExp[] = [/^main$/, /^master$/, /^production$/, /^gh-pages$/];

/**
 * Regex to match JIRA issue keys.
 */
export const JIRA_REGEX_MATCHER = /\d+-(([A-Z0-9]{1,10})|[a-z0-9]{1,10})/g;

/**
 * Default total maximum number of additions after which action-jira-linter will discourage the PR as it is
 * considered "too huge to review".
 */
export const DEFAULT_PR_ADDITIONS_THRESHOLD = 800;
