import * as core from "@actions/core";
import * as github from "@actions/github";

import {
  CreateIssueCommentParams,
  JIRADetails,
  JIRALintActionInputs,
  Label,
  PullRequestParams,
  PullRequestUpdateParams,
  UpdateIssueParams,
} from "./types";
import { DEFAULT_PR_ADDITIONS_THRESHOLD } from "./constants";
import { GitHub } from "./github";
import { Jira } from "./jira";

const getInputs = (): JIRALintActionInputs => {
  const JIRA_USER: string = core.getInput("jira-user", { required: true });
  const JIRA_TOKEN: string = core.getInput("jira-token", { required: true });
  const JIRA_BASE_URL: string = core.getInput("jira-base-url", {
    required: true,
  });
  const GITHUB_TOKEN: string = core.getInput("github-token", {
    required: true,
  });
  const BRANCH_IGNORE_PATTERN: string =
    core.getInput("skip-branches", { required: false }) || "";
  const SKIP_COMMENTS: boolean =
    core.getInput("skip-comments", { required: false }) === "true";
  const PR_THRESHOLD = parseInt(
    core.getInput("pr-threshold", { required: false }),
    10,
  );
  const VALIDATE_ISSUE_STATUS: boolean =
    core.getInput("validate_issue_status", { required: false }) === "true";
  const ALLOWED_ISSUE_STATUSES: string = core.getInput(
    "allowed_issue_statuses",
  );

  return {
    JIRA_USER,
    JIRA_TOKEN,
    GITHUB_TOKEN,
    BRANCH_IGNORE_PATTERN,
    SKIP_COMMENTS,
    PR_THRESHOLD: isNaN(PR_THRESHOLD)
      ? DEFAULT_PR_ADDITIONS_THRESHOLD
      : PR_THRESHOLD,
    JIRA_BASE_URL: JIRA_BASE_URL.endsWith("/")
      ? JIRA_BASE_URL.replace(/\/$/, "")
      : JIRA_BASE_URL,
    VALIDATE_ISSUE_STATUS,
    ALLOWED_ISSUE_STATUSES,
  };
};

async function run(): Promise<void> {
  try {
    const {
      JIRA_USER,
      JIRA_TOKEN,
      JIRA_BASE_URL,
      GITHUB_TOKEN,
      BRANCH_IGNORE_PATTERN,
      SKIP_COMMENTS,
      PR_THRESHOLD,
      VALIDATE_ISSUE_STATUS,
      ALLOWED_ISSUE_STATUSES,
    } = getInputs();

    const defaultAdditionsCount = 800;
    const prThreshold: number = PR_THRESHOLD
      ? Number(PR_THRESHOLD)
      : defaultAdditionsCount;

    const {
      payload: { repository, pull_request: pullRequest },
    } = github.context;

    if (typeof repository === "undefined") {
      throw new Error(`Missing 'repository' from github action context.`);
    }

    console.log(pullRequest);

    const {
      name: repo,
      owner: { login: owner },
    } = repository;

    const {
      base: { ref: baseBranch },
      head: { ref: headBranch },
      number: prNumber = 0,
      body: prBody = "",
      additions = 0,
      title = "",
    } = pullRequest as PullRequestParams;

    // common fields for both issue and comment
    const commonPayload: UpdateIssueParams = { owner, repo, issue: prNumber };
    const gh = new GitHub(GITHUB_TOKEN);
    const jira = new Jira(JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN);

    if (!headBranch && !baseBranch) {
      const commentBody =
        "jira-lint is unable to determine the head and base branch";
      const comment: CreateIssueCommentParams = {
        ...commonPayload,
        body: commentBody,
      };
      await gh.addComment(comment);

      core.setFailed("Unable to get the head and base branch");
      process.exit(1);
    }

    console.log("Base branch -> ", baseBranch);
    console.log("Head branch -> ", headBranch);

    if (gh.shouldSkipBranchLint(headBranch, BRANCH_IGNORE_PATTERN)) {
      process.exit(0);
    }

    const issueKeys = jira.getJIRAIssueKeys(headBranch);
    if (!issueKeys.length) {
      const body = jira.getNoIdComment(headBranch);
      const comment = { ...commonPayload, body };
      await gh.addComment(comment);

      core.setFailed("JIRA issue id is missing in your branch.");
      process.exit(1);
    }

    // use the last match (end of the branch name)
    const issueKey = issueKeys[issueKeys.length - 1];
    console.log(`JIRA key -> ${issueKey}`);

    const details: JIRADetails = await jira.getTicketDetails(issueKey);
    if (details.key) {
      const podLabel: Label = { name: details?.project?.name || "" };
      const hotfixLabel: Label = { name: gh.getHotfixLabel(baseBranch) };
      const typeLabel: Label = { name: details?.type?.name || "" };
      const labels: Label[] = [podLabel, hotfixLabel, typeLabel].filter((l) =>
        l != null && l.name != null
      );
      console.log("Adding lables -> ", labels);

      await gh.addLabels({ ...commonPayload, labels });

      if (gh.shouldUpdatePRDescription(prBody)) {
        console.log("Updating PR description…", prBody);

        const body: string = jira.getPRDescription(prBody, details);

        const prData: PullRequestUpdateParams = {
          owner,
          repo,
          pullRequestNumber: prNumber,
          body,
        };
        await gh.updatePrDetails(prData);

        // add comment for PR title
        if (!SKIP_COMMENTS) {
          const prTitleCommentBody = gh.getPRTitleComment(
            details.summary,
            title,
          );
          const prTitleComment = { ...commonPayload, body: prTitleCommentBody };
          console.log("Adding comment for the PR title");
          gh.addComment(prTitleComment);

          // add a comment if the PR is huge
          if (gh.isHumongousPR(additions, prThreshold)) {
            const hugePrCommentBody = gh.getHugePrComment(
              additions,
              prThreshold,
            );
            const hugePrComment = { ...commonPayload, body: hugePrCommentBody };
            console.log("Adding comment for huge PR");
            gh.addComment(hugePrComment);
          }
        }
      } else {
        console.log("PR description will not be updated.");
      }

      if (
        !jira.isIssueStatusValid(
          VALIDATE_ISSUE_STATUS,
          ALLOWED_ISSUE_STATUSES.split(","),
          details,
        )
      ) {
        const body = jira.getInvalidIssueStatusComment(
          details.status,
          ALLOWED_ISSUE_STATUSES,
        );
        const invalidIssueStatusComment = { ...commonPayload, body };
        console.log("Adding comment for invalid issue status");
        await gh.addComment(invalidIssueStatusComment);

        core.setFailed(
          "The found jira issue does is not in acceptable statuses",
        );
        process.exit(1);
      } else {
        console.log("The issue status is valid.");
      }
    } else {
      const body = jira.getNoIdComment(headBranch);
      const comment = { ...commonPayload, body };
      await gh.addComment(comment);

      core.setFailed(
        "Invalid JIRA key. Please create a branch with a valid JIRA issue key.",
      );
      process.exit(1);
    }
  } catch (error) {
    console.log({ error });
    core.setFailed((error as Error)?.message ?? "An unknown error occurred");
    process.exit(1);
  }
}

run();
