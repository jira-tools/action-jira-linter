import axios, { AxiosInstance } from 'axios';
import * as core from '@actions/core';
import { JIRA, JIRADetails } from './types';
import { HIDDEN_MARKER, JIRA_REGEX_MATCHER } from './constants';

export class Jira {
  client: AxiosInstance;
  baseURL: string;

  constructor(baseURL: string, username: string, token: string) {
    this.baseURL = baseURL;
    this.client = this.getJIRAClient(baseURL, username, token);
  }

  /**
   * Get links to labels & remove spacing so the table works.
   */
  static getLabelsForDisplay = (labels: JIRADetails['labels']): string => {
    if (!labels || !labels.length) {
      return '-';
    }
    const markUp = labels.map((label) => `<a href="${label.url}" title="${label.name}">${label.name}</a>`).join(', ');
    return markUp.replace(/\s+/, ' ');
  };

  /** Extract JIRA issue keys from a string. */
  static getJIRAIssueKeys = (input: string): string[] => {
    const matches = this.reverseString(input).toUpperCase().match(JIRA_REGEX_MATCHER);
    if (matches?.length) {
      return matches.map(this.reverseString).reverse();
    } else return [];
  };

  private getJIRAClient = (baseURL: string, username: string, token: string): AxiosInstance => {
    const credentials = `${username}:${token}`;
    const authorization = Buffer.from(credentials).toString('base64');
    return axios.create({
      baseURL: `${baseURL}/rest/api/3`,
      timeout: 2000,
      headers: { authorization: `Basic ${authorization}` },
    });
  };

  getTicketDetails = async (key: string): Promise<JIRADetails> => {
    try {
      const issue: JIRA.Issue = await this.getIssue(key);
      const {
        fields: {
          issuetype: type,
          project,
          summary,
          customfield_10016: estimate,
          labels: rawLabels,
          status: issueStatus,
        },
      } = issue;

      const labels = rawLabels.map((label) => ({
        name: label,
        url: `${this.baseURL}/issues?jql=${encodeURIComponent(
          `project = ${project.key} AND labels = ${label} ORDER BY created DESC`
        )}`,
      }));

      return {
        key,
        summary,
        url: `${this.baseURL}/browse/${key}`,
        status: issueStatus.name,
        type: {
          name: type.name,
          icon: type.iconUrl,
        },
        project: {
          name: project.name,
          url: `${this.baseURL}/browse/${project.key}`,
          key: project.key,
        },
        estimate: typeof estimate === 'string' || typeof estimate === 'number' ? estimate : 'N/A',
        labels,
      };
    } catch (e) {
      throw e;
    }
  };

  getIssue = async (id: string): Promise<JIRA.Issue> => {
    try {
      const response = await this.client.get<JIRA.Issue>(
        `/issue/${id}?fields=project,summary,issuetype,labels,status,customfield_10016`
      );
      return response.data;
    } catch (e) {
      throw e;
    }
  };

  /** Get PR description with story/issue details. */
  static getPRDescription = (body: string, details: JIRADetails): string => {
    const displayKey = details.key.toUpperCase();

    let description = `
<details open>
  <summary><a href="${details.url}" title="${displayKey}" target="_blank">${displayKey}</a></summary>
  <br />
  <table>
    <tr>
      <th>Summary</th>
      <td>${details.summary}</td>
    </tr>
    <tr>
      <th>Type</th>
      <td>
        <img alt="${details.type.name}" src="${details.type.icon}" />
        ${details.type.name}
      </td>
    </tr>
    <tr>
      <th>Status</th>
      <td>${details.status}</td>
    </tr>
    <tr>
      <th>Points</th>
      <td>${details.estimate || 'N/A'}</td>
    </tr>
    <tr>
      <th>Labels</th>
      <td>${this.getLabelsForDisplay(details.labels)}</td>
    </tr>
  </table>
</details>
<!--
  do not remove this marker as it will break jira-linter's functionality.
  ${HIDDEN_MARKER}
-->`;

    if (body !== undefined && body !== null && body.trim() !== '') {
      description += `
---

${body}`;
    }

    return description;
  };

  /** Get the comment body for pr with no JIRA id in the branch name. */
  static getNoIdComment = (branch: string): string => {
    return `<p> A JIRA Issue ID is missing from your branch name! 🦄</p>
<p>Your branch: ${branch}</p>
<p>If this is your first time contributing to this repository - welcome!</p>
<hr />
<p>Please refer to <a href="https://github.com/btwrk/jira-linter">jira-linter</a> to get started.
<p>Without the JIRA Issue ID in your branch name you would lose out on automatic updates to JIRA via SCM; some GitHub status checks might fail.</p>
Valid sample branch names:

  ‣ feature/shiny-new-feature--mojo-10'
  ‣ 'chore/changelogUpdate_mojo-123'
  ‣ 'bugfix/fix-some-strange-bug_GAL-2345'
`;
  };

  /** Check if jira issue status validation is enabled then compare the issue status will the allowed statuses. */
  static isIssueStatusValid = (
    shouldValidate: boolean,
    allowedIssueStatuses: string[],
    details: JIRADetails
  ): boolean => {
    if (!shouldValidate) {
      // eslint-disable-next-line i18n-text/no-en
      core.info('Skipping Jira issue status validation as shouldValidate is false');
      return true;
    }

    return allowedIssueStatuses.includes(details.status);
  };

  /** Get the comment body for very huge PR. */
  static getInvalidIssueStatusComment = (
    /** Number of additions. */
    issueStatus: string,
    /** Threshold of additions allowed. */
    allowedStatuses: string
  ): string =>
    `<p>:broken_heart: The detected issue is not in one of the allowed statuses :broken_heart: </p>
   <table>
     <tr>
        <th>Detected Status</th>
        <td>${issueStatus}</td>
        <td>:x:</td>
     </tr>
     <tr>
        <th>Allowed Statuses</th>
        <td>${allowedStatuses}</td>
        <td>:heavy_check_mark:</td>
      </tr>
   </table>
   <p>Please ensure your jira story is in one of the allowed statuses</p>
  `;

  /** Reverse a string. */
  private static reverseString = (input: string): string => input.split('').reverse().join('');
}
