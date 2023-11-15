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
  static getPRDescription = (body: string | null, details: JIRADetails, open: boolean): string => {
    const displayKey = details.key.toUpperCase();

    return `
<!-- ${HIDDEN_MARKER} -->
<details${open ? ' open' : ''}>
  <summary><a href="${details.url}" title="${displayKey}" target="_blank">${displayKey}</a></summary>
  <br />
  <table>
    <tr><th>Summary</th><td>${details.summary}</td></tr>
    <tr><th>Type</th><td><img alt="${details.type.name}" src="${details.type.icon}" /> ${details.type.name}</td>
    </tr>
    <tr><th>Status</th><td>${details.status}</td></tr>
    <tr><th>Points</th><td>${details.estimate || 'N/A'}</td></tr>
    <tr><th>Labels</th><td>${this.getLabelsForDisplay(details.labels)}</td></tr>
  </table>
</details>

${body ?? ''}`;
  };

  /** Get the comment body for pr with no JIRA id. */
  static getNoIdComment = (): string => {
    return `A JIRA Issue ID is missing from your branch name or PR title! 🦄

Please either name your branch to contain a valid Jira ID, or include one in your PR title.

If this is your first time contributing, refer to <a href="https://github.com/reliancehealthinc/action-jira-linter">action-jira-linter</a> to learn more about Jira linting.

Valid sample branch names:

- \`feature/shiny-new-feature--mojo-10\`
- \`chore/changelogUpdate_mojo-123\`
- \`bugfix/fix-some-strange-bug_GAL-2345\``;
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
  static getInvalidIssueStatusComment = (issueStatus: string, allowedStatuses: string[]): string => {
    const allowedStatusesString = allowedStatuses.join(', ');

    return `<p>:broken_heart: The detected issue is not in one of the allowed statuses :broken_heart: </p>
      <table>
        <tr>
            <th>Detected Status</th>
            <td>${issueStatus}</td>
            <td>:x:</td>
        </tr>
        <tr>
            <th>Allowed Statuses</th>
            <td>${allowedStatusesString}</td>
            <td>:heavy_check_mark:</td>
          </tr>
      </table>
      <p>Please ensure your jira story is in one of the allowed statuses</p>
    `;
  };

  /** Check if jira project validation is enabled then compare the issue project with the allowed statuses. */
  static isProjectValid = (
    shouldValidate: boolean,
    allowedProjects: string[],
    details: JIRADetails
  ): boolean => {
    if (!shouldValidate) {
      // eslint-disable-next-line i18n-text/no-en
      core.info('Skipping Jira project validation as shouldValidate is false');
      return true;
    }

    return allowedProjects.includes(details.project.key);
  };
  
  /** Get the comment body for invalid project */
  static getInvalidProjectComment = (issueProject: string, allowedProjects: string[]): string => {
    const allowedProjectsString = allowedProjects.join(', ');

    return `<p>:broken_heart: The detected issue is not in one of the allowed projects :broken_heart: </p>
      <table>
        <tr>
            <th>Detected Project</th>
            <td>${issueProject}</td>
            <td>:x:</td>
        </tr>
        <tr>
            <th>Allowed Projects</th>
            <td>${allowedProjectsString}</td>
            <td>:heavy_check_mark:</td>
          </tr>
      </table>
      <p>Please ensure your jira ticket is created in the right project</p>
    `;

  };

  /** Check if jira type validation is enabled then compare the issue type with the allowed types. */
  static isIssueTypeValid = (
    shouldValidate: boolean,
    allowedTypes: string[],
    details: JIRADetails
  ): boolean => {
    if (!shouldValidate) {
      // eslint-disable-next-line i18n-text/no-en
      core.info('Skipping Jira issue type validation as shouldValidate is false');
      return true;
    }

    return allowedTypes.includes(details.type.name);
  };
  
  /** Get the comment body for invalid issue type */
  static getInvalidIssueTypeComment = (issueType: string, allowedTypes: string[]): string => {
    const allowedTypesString = allowedTypes.join(', ');

    return `<p>:broken_heart: The detected issue is not an allowed type :broken_heart: </p>
      <table>
        <tr>
            <th>Detected Issue Type</th>
            <td>${issueType}</td>
            <td>:x:</td>
        </tr>
        <tr>
            <th>Allowed Issue Types</th>
            <td>${allowedTypesString}</td>
            <td>:heavy_check_mark:</td>
          </tr>
      </table>
      <p>Please ensure your jira ticket is created as the right type.</p>
    `;

  };

    /** Reverse a string. */
  private static reverseString = (input: string): string => input.split('').reverse().join('');
}
