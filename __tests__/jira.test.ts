/* eslint-disable i18n-text/no-en */
/* eslint-disable filenames/match-regex */

import { Jira } from '../src/jira';
import { GitHub } from '../src/github';
import { JIRADetails } from '../src/types';

jest.spyOn(console, 'log').mockImplementation(); // avoid actual console.log in test output

describe('getJIRAIssueKeys()', () => {
  it('gets multiple keys from a string', () => {
    expect(
      Jira.getJIRAIssueKeys(
        'BF-18 abc-123 X-88 ABCDEFGHIJKL-999 abc XY-Z-333 abcDEF-33 ABCDEF-33 abcdef-33 ABC-1 PB2-1 pb2-1 P2P-1 p2p-1'
      )
    ).toEqual([
      'BF-18',
      'ABC-123',
      'X-88',
      'CDEFGHIJKL-999',
      'Z-333',
      'ABCDEF-33',
      'ABCDEF-33',
      'ABCDEF-33',
      'ABC-1',
      'PB2-1',
      'PB2-1',
      'P2P-1',
      'P2P-1',
    ]);
  });

  it('gets jira key from different branch names', () => {
    expect(Jira.getJIRAIssueKeys('fix/login-protocol-es-43')).toEqual(['ES-43']);
    expect(Jira.getJIRAIssueKeys('fix/login-protocol-ES-43')).toEqual(['ES-43']);
    expect(Jira.getJIRAIssueKeys('feature/newFeature_esch-100')).toEqual(['ESCH-100']);
    expect(Jira.getJIRAIssueKeys('feature/newFeature_ESCH-101')).toEqual(['ESCH-101']);
    expect(Jira.getJIRAIssueKeys('feature/newFeature--mojo-5611')).toEqual(['MOJO-5611']);
    expect(Jira.getJIRAIssueKeys('feature/newFeature--MOJO-6789')).toEqual(['MOJO-6789']);

    expect(Jira.getJIRAIssueKeys('chore/task-with-dashes--MOJO-6789')).toEqual(['MOJO-6789']);
    expect(Jira.getJIRAIssueKeys('chore/task_with_underscores--MOJO-6789')).toEqual(['MOJO-6789']);
    expect(Jira.getJIRAIssueKeys('chore/MOJO-6789-task_with_underscores')).toEqual(['MOJO-6789']);
    expect(Jira.getJIRAIssueKeys('MOJO-6789/task_with_underscores')).toEqual(['MOJO-6789']);

    expect(Jira.getJIRAIssueKeys('MOJO-6789/task_with_underscores-ES-43')).toEqual(['MOJO-6789', 'ES-43']);
    expect(Jira.getJIRAIssueKeys('nudge-live-chat-users-Es-172')).toEqual(['ES-172']);

    expect(Jira.getJIRAIssueKeys('feature/missingKey')).toEqual([]);
    expect(Jira.getJIRAIssueKeys('')).toEqual([]);
  });
});

describe('getPRDescription()', () => {
  it('should include the hidden marker when getting PR description', () => {
    const issue: JIRADetails = {
      key: 'ABC-123',
      url: 'url',
      type: { name: 'feature', icon: 'feature-icon-url' },
      estimate: 1,
      labels: [{ name: 'frontend', url: 'frontend-url' }],
      summary: 'Story title or summary',
      project: { name: 'project', url: 'project-url', key: 'abc' },
      status: 'In Progress',
    };
    const description = Jira.getPRDescription('some_body', issue);

    expect(GitHub.shouldUpdatePRDescription(description)).toBeFalsy();
    expect(description).toContain(issue.key);
    expect(description).toContain(issue.estimate.toString());
    expect(description).toContain(issue.status);
    expect(description).toContain(issue.labels[0].name);
  });
});

describe('getNoIdComment()', () => {
  it('should return the comment content with the branch name', () => {
    expect(Jira.getNoIdComment('test_new_feature')).toContain('test_new_feature');
  });
});

describe('getLabelsForDisplay()', () => {
  it('generates label markup without spaces', () => {
    expect(
      Jira.getLabelsForDisplay([
        { name: 'one', url: 'url-one' },
        { name: 'two', url: 'url-two' },
      ])
    ).toBe(`<a href="url-one" title="one">one</a>, <a href="url-two" title="two">two</a>`);
  });
});

describe('JIRA Client', () => {
  // use this to test if the token is correct
  it.skip('should be able to access the issue', async () => {
    const jira = new Jira('https://cleartaxtech.atlassian.net/', '<username>', '<token_here>');
    const details = await jira.getTicketDetails('ES-10');
    console.log({ details });
    expect(details).not.toBeNull();
  });
});

describe('isIssueStatusValid()', () => {
  const issue: JIRADetails = {
    key: 'ABC-123',
    url: 'url',
    type: { name: 'feature', icon: 'feature-icon-url' },
    estimate: 1,
    labels: [{ name: 'frontend', url: 'frontend-url' }],
    summary: 'Story title or summary',
    project: { name: 'project', url: 'project-url', key: 'abc' },
    status: 'Assessment',
  };

  it('should return false if issue validation was enabled but invalid issue status', () => {
    const expectedStatuses = ['In Test', 'In Progress'];
    expect(Jira.isIssueStatusValid(true, expectedStatuses, issue)).toBeFalsy();
  });

  it('should return true if issue validation was enabled but issue has a valid status', () => {
    const expectedStatuses = ['In Test', 'In Progress'];
    issue.status = 'In Progress';
    expect(Jira.isIssueStatusValid(true, expectedStatuses, issue)).toBeTruthy();
  });

  it('should return true if issue status validation is not enabled', () => {
    const expectedStatuses = ['In Test', 'In Progress'];
    expect(Jira.isIssueStatusValid(false, expectedStatuses, issue)).toBeTruthy();
  });
});

describe('getInvalidIssueStatusComment()', () => {
  it('should return content with the passed in issue status and allowed statses', () => {
    expect(Jira.getInvalidIssueStatusComment('Assessment', ['In Progress'])).toContain('Assessment');
    expect(Jira.getInvalidIssueStatusComment('Assessment', ['In Progress'])).toContain('In Progress');
  });
});
