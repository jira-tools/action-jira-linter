import { AxiosInstance } from 'axios';

export interface UpdateParams {
  owner: string;
  repo: string;
}

export interface UpdateIssueParams extends UpdateParams {
  issue: number;
}

export interface PullRequestUpdateParams extends UpdateParams {
  pullRequestNumber: number;
  body?: string;
}

export interface PullRequestParams {
  number: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  html_url?: string;
  body?: string;
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  changed_files?: number;
  additions?: number;
  title?: string;
  [key: string]: unknown;
}

export interface CreateIssueCommentParams extends UpdateIssueParams {
  body: string;
}

// eslint-disable-next-line no-shadow
export enum StoryType {
  feature = 'feature',
  bug = 'bug',
  chore = 'chore',
  release = 'release',
}

export interface Label {
  name: string;
}

export interface UpdateLabelParams extends UpdateIssueParams {
  labels: string[];
}

// eslint-disable-next-line no-shadow
export const enum StoryState {
  accepted = 'accepted',
  delivered = 'delivered',
  finished = 'finished',
  planned = 'planned',
  rejected = 'rejected',
  started = 'started',
  unscheduled = 'unscheduled',
  unstarted = 'unstarted',
}

export namespace JIRA {
  export interface IssueStatus {
    self: string;
    description: string;
    iconUrl: string;
    name: string;
    id: string;
    statusCategory: {
      self: string;
      id: number;
      key: string;
      colorName: string;
      name: string;
    };
  }

  export interface IssuePriority {
    self: string;
    iconUrl: string;
    name: string;
    id: string;
  }

  export interface IssueType {
    self: string;
    id: string;
    description: string;
    iconUrl: string;
    name: string;
    subtask: boolean;
    avatarId: number;
  }

  export interface IssueProject {
    self: string;
    key: string;
    name: string;
  }

  export interface Issue {
    id: string;
    key: string;
    self: string;
    status: string;
    fields: {
      summary: string;
      status: IssueStatus;
      priority: IssuePriority;
      issuetype: IssueType;
      project: IssueProject;
      labels: string[];
      [k: string]: unknown;
    };
  }
}

export interface JIRADetails {
  key: string;
  summary: string;
  url: string;
  status: string;
  type: {
    name: string;
    icon: string;
  };
  project: {
    name: string;
    url: string;
    key: string;
  };
  estimate: string | number;
  labels: readonly { name: string; url: string }[];
}

export interface JIRALintActionInputs {
  jiraUser: string;
  jiraToken: string;
  jiraBaseURL: string;
  githubToken: string;
  branchIgnorePattern: string;
  skipComments: boolean;
  prThreshold: number;
  validateIssueStatus: boolean;
  allowedIssueStatuses: string[];
  validateProject: boolean;
  allowedProjects: string[];
  validateType: boolean;
  allowedTypes: string[];
  failOnError: boolean;
  ignoredLabelTypes: string[];
  detailsOpen: boolean;
}

export interface JIRAClient {
  client: AxiosInstance;
  /** Get complete JIRA Issue details. */
  getIssue: (key: string) => Promise<JIRA.Issue>;
  /** Get required details to display in PR. */
  getTicketDetails: (key: string) => Promise<JIRADetails>;
}
