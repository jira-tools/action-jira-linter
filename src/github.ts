import * as core from '@actions/core';
import * as octokit from '@octokit/rest';
import * as github from '@actions/github';
import similarity from 'string-similarity';
import { CreateIssueCommentParams, PullRequestUpdateParams, UpdateLabelParams } from './types';
import { BOT_BRANCH_PATTERNS, DEFAULT_BRANCH_PATTERNS, MARKER_REGEX } from './constants';

export class GitHub {
  static labels = {
    hotfixPreProd: 'HOTFIX-PRE-PROD',
    hotfixProd: 'HOTFIX-PROD',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: octokit.Octokit & any;

  constructor(token: string) {
    this.client = github.getOctokit(token);
  }

  /** Add the specified label to the PR. */
  addLabels = async (labelData: UpdateLabelParams): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { owner, repo, issue: issue_number, labels } = labelData;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      await this.client.issues.addLabels({ owner, repo, issue_number, labels });
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line i18n-text/no-en
      core.setFailed((error as Error)?.message ?? 'Failed to add labels');
      process.exit(1);
    }
  };

  /** Update a PR details. */
  updatePrDetails = async (prData: PullRequestUpdateParams): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { owner, repo, pullRequestNumber: pull_number } = prData;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      await this.client.pulls.update({ owner, repo, pull_number });
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line i18n-text/no-en
      core.setFailed((error as Error)?.message ?? 'Failed to update PR details');
      process.exit(1);
    }
  };

  /** Add a comment to a PR. */
  addComment = async (comment: CreateIssueCommentParams): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { owner, repo, issue: issue_number, body } = comment;
      await this.client.issues.createComment({
        owner,
        repo,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        issue_number,
        body,
      });
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line i18n-text/no-en
      core.setFailed((error as Error)?.message ?? 'Failed to add comment');
    }
  };

  /** Get a comment based on story title and PR title similarity. */
  getPRTitleComment = (storyTitle: string, prTitle: string): string => {
    const matchRange: number = similarity.compareTwoStrings(storyTitle, prTitle);
    if (matchRange < 0.2) {
      return `<p>
      Knock Knock! 🔍
    </p>
    <p>
      Just thought I'd let you know that your <em>PR title</em> and <em>story title</em> look <strong>quite different</strong>. PR titles
      that closely resemble the story title make it easier for reviewers to understand the context of the PR.
    </p>
    <blockquote>
      An easy-to-understand PR title a day makes the reviewer review away! 😛⚡️
    </blockquote>
    <table>
      <tr>
        <th>Story Title</th>
        <td>${storyTitle}</td>
      </tr>
      <tr>
          <th>PR Title</th>
          <td>${prTitle}</td>
        </tr>
    </table>
    <p>
      Check out this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> to learn more about PR best-practices.
    </p>
    `;
    } else if (matchRange >= 0.2 && matchRange <= 0.4) {
      return `<p>
      Let's make that PR title a 💯 shall we? 💪
      </p>
      <p>
      Your <em>PR title</em> and <em>story title</em> look <strong>slightly different</strong>. Just checking in to know if it was intentional!
      </p>
      <table>
        <tr>
          <th>Story Title</th>
          <td>${storyTitle}</td>
        </tr>
        <tr>
            <th>PR Title</th>
            <td>${prTitle}</td>
          </tr>
      </table>
      <p>
        Check out this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a> to learn more about PR best-practices.
      </p>
      `;
    }
    return `<p>I'm a bot and I 👍 this PR title. 🤖</p>

    <img src="https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" width="400" />`;
  };

  /**
   * Check if the PR is an automated one created by a bot or one matching ignore patterns supplied
   * via action metadata.
   *
   * @example shouldSkipBranchLint('dependabot') -> true
   * @example shouldSkipBranchLint('feature/update_123456789') -> false
   */
  static shouldSkipBranchLint = (branch: string, additionalIgnorePattern?: string): boolean => {
    if (BOT_BRANCH_PATTERNS.some((pattern) => pattern.test(branch))) {
      console.log(`You look like a bot 🤖 so we're letting you off the hook!`);
      return true;
    }

    if (DEFAULT_BRANCH_PATTERNS.some((pattern) => pattern.test(branch))) {
      console.log(`Ignoring check for default branch ${branch}`);
      return true;
    }

    const ignorePattern = new RegExp(additionalIgnorePattern || '');
    if (!!additionalIgnorePattern && ignorePattern.test(branch)) {
      console.log(
        `branch '${branch}' ignored as it matches the ignore pattern '${additionalIgnorePattern}' provided in skip-branches`
      );
      return true;
    }

    console.log(`branch '${branch}' does not match ignore pattern provided in 'skip-branches' option:`, ignorePattern);
    return false;
  };

  /**
   * Returns true if the body contains the hidden marker. Used to avoid adding
   * story details to the PR multiple times.
   *
   * @example shouldUpdatePRDescription('--\nadded_by_pr_lint\n') -> true
   * @example shouldUpdatePRDescription('# some description') -> false
   */
  static shouldUpdatePRDescription = (
    /** The PR description/body as a string. */
    body?: string
  ): boolean => {
    if (typeof body === 'string' && body != null && body !== undefined) {
      // Check if the body contains the hidden marker and return false
      // (i.e. don't update the PR description) if it's found.
      const foundMarker = MARKER_REGEX.test(body);

      if (foundMarker) {
        console.log('Marker found, PR description will not be updated.');
      } else {
        console.log('Marker not found, PR description will updated.');
      }

      return !foundMarker;
    }

    // Return true to update the PR description by default.
    return true;
  };

  /** Check if a PR is considered "huge". */
  static isHumongousPR = (additions: number, threshold: number): boolean =>
    typeof additions === 'number' && additions > threshold;

  /** Get the comment body for very huge PR. */
  static getHugePrComment = (
    /** Number of additions. */
    additions: number,
    /** Threshold of additions allowed. */
    threshold: number
  ): string =>
    `<p>This PR is too huge for one to review :broken_heart: </p>
    <img src="https://media.giphy.com/media/26tPskka6guetcHle/giphy.gif" width="400" />
    <table>
      <tr>
        <th>Additions</th>
        <td>${additions} :no_good_woman: </td>
      </tr>
      <tr>
        <th>Expected</th>
        <td>:arrow_down: ${threshold}</td>
      </tr>
    </table>
    <p>Consider breaking it down into multiple small PRs.</p>
    <p>
      Check out this <a href="https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests">guide</a>
      to learn more about PR best-practices.
    </p>
  `;

  /** Return a hotfix label based on base branch type. */
  static getHotfixLabel = (baseBranch: string): string => {
    if (baseBranch.startsWith('release/v')) return this.labels.hotfixPreProd;
    if (baseBranch.startsWith('production')) return this.labels.hotfixProd;
    return '';
  };
}
