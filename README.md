# action-jira-linter 🧹

> A light-weight lint workflow to unite the worlds of GitHub and [Jira][jira].
> Based on the fine work of [ClearTax][cleartax] on [jira-lint].

[![Latest release][latest-release-badge]][latest-release]
[![License][license-badge]][license]
[![All Contributors][all-contributors-badge]](#contributors)
![test][test-badge]
![CodeQL][codeql-badge]
[![Codacy Badge][codacy-badge]][codacy]
[![Codecov][codecov-badge]][codecov]

---

<!-- toc -->

- [action-jira-linter 🧹](#action-jira-linter-)
  - [Installation](#installation)
  - [Features](#features)
    - [PR Status Checks](#pr-status-checks)
    - [PR Description & Labels](#pr-description--labels)
      - [Description](#description)
      - [Labels](#labels)
      - [Issue Status Validation](#issue-status-validation)
      - [Soft-validations via comments](#soft-validations-via-comments)
    - [Options](#options)
    - [Skipping branches](#skipping-branches)
  - [Contributing](#contributing)
  - [FAQ](#faq)
  - [Contributors](#contributors)

<!-- tocstop -->

## Installation

To make `action-jira-linter` a part of your workflow, just add a
`action-jira-linter.yml` file in your `.github/workflows/` directory in your
GitHub repository.

```yml
name: action-jira-linter
on: [pull_request]

jobs:
  action-jira-linter:
    runs-on: ubuntu-latest
    steps:
      - uses: btwrk/action-jira-linter@v1.0.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          jira-token: ${{ secrets.JIRA_TOKEN }}
          jira-base-url: https://your-domain.atlassian.net
```

It can also be used as part of an existing workflow by adding it as a step. More
information about the [options here](#options).

## Features

### PR Status Checks

`action-jira-linter` adds a status check which helps you avoid merging PRs which
are missing a valid Jira Issue Key in the branch name. It will use the [Jira
API][jira-api] to validate a given key.

### PR Description & Labels

#### Description

When a PR passes the above check, `action-jira-linter` will also add the issue
details to the top of the PR description. It will pick details such as the Issue
summary, type, estimation points, status and labels and add them to the PR
description.

#### Labels

`action-jira-linter` will automatically label PRs with:

- A label based on the Jira Project name (the project the issue belongs to). For
  example, if your project name is `Escher` then it will add `escher` as a
  label.
- `HOTFIX-PROD` - if the PR is raised against `production-release`.
- `HOTFIX-PRE-PROD` - if the PR is raised against `release/v*`.
- Jira issue type ([based on your project][issue-types]).

<figure>
 <img src="https://user-images.githubusercontent.com/12283/181632952-ca6e0b3a-7192-4bbf-a5cc-ba90333cf7ab.png" alt="Issue details and labels added to a PR" />
 <figcaption>
 Issue details and labels added to a PR.
 </figcaption>
</figure>

#### Issue Status Validation
Issue status is shown in the [Description](#description).

**Why validate issue status?**
In some cases, one may be pushing changes for a story that is set to
`Done`/`Completed` or it may not have been pulled into working backlog or
current sprint.

This option allows discouraging pushing to branches for stories that are set to
statuses other than the ones allowed in the project; for example - you may want
to only allow PRs for stories that are in `To Do`/`Planning`/`In Progress`
states.

The following flags can be used to validate issue status:
- `validate-issue-status`
  - If set to `true`, `action-jira-linter` will validate the issue status based on `allowed-issue-statuses`
- `allowed-issue-statuses`
  - This will only be used when `validate-issue-status` is `true`. This should be a comma separated list of statuses. If the detected issue's status is not in one of the `allowed-issue-statuses` then `action-jira-linter` will fail the status check.

**Example of invalid status**

```html
<p>:broken_heart: The detected issue is not in one of the allowed statuses :broken_heart: </p>
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
```

#### Soft-validations via comments

`action-jira-linter` will add comments to a PR to encourage better PR practices:

**A good PR title**

<figure>
  <img src="https://user-images.githubusercontent.com/6426069/69525276-c6e62b80-0f8d-11ea-9db4-23d524b5276c.png" />
  <figcaption>When the title of the PR matches the summary/title of the issue well.</figcaption>
</figure>

---

<figure>
  <img src="https://user-images.githubusercontent.com/6426069/69480647-6a6cfa00-0e2f-11ea-8750-4294f686dac7.png" />
  <figcaption>When the title of the PR is <strong>slightly different</strong> compared to the summary/title of the issue</figcaption>
</figure>

---

<figure>
  <img src="https://user-images.githubusercontent.com/6426069/69526103-7243b000-0f8f-11ea-9deb-acb8cbb6610b.png" />
  <figcaption>When the title of the PR is <strong>very different</strong>  compared to the summary/title of the issue</figcaption>
</figure>

---

**A comment discouraging PRs which are too large (based on number of lines of code changed).**

<figure>
  <img src="https://user-images.githubusercontent.com/6426069/69480043-e06e6280-0e29-11ea-8e24-173355c304dd.png" />
  <figcaption>Batman says no large PRs 🦇</figcaption>
</figure>

### Options

A full example with all available options and example values is provided below.

```yml
- uses: btwrk/action-jira-linter@v1.0.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    jira-token: ${{ secrets.JIRA_TOKEN }}
    jira-base-url: https://your-domain.atlassian.net
    skip-branches: '^(production-release|master|release\/v\d+)$'
    skip-comments: true
    pr-threshold: 1000
    validate-issue-status: true
    allowed-issue-statuses: |
      To Do
      In Progress
      Done
    fail-on-error: false
```

| Key                      | Description                                                                                                                                                                                                                                             | Required | Default         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | --------------- |
| `github-token`           | Token used to update PR description. `GITHUB_TOKEN` is already available [when you use GitHub actions][ghtoken], so all that is required is to pass it as a param here.                                                                                 |     x    | `null`          |
| `jira-token`             | Token used to fetch Jira Issue information.  Check [below](#jira-token) for more details on how to generate the token.                                                                                                                                  |     x    | `null`          |
| `jira-base-url`          | The subdomain of JIRA cloud that you use to access it. Ex: `https://your-domain.atlassian.net`.                                                                                                                                                         |     x    | `null`          |
| `skip-branches`          | A regex to ignore running `action-jira-linter` on certain branches, like production etc.                                                                                                                                                                       |          | `''`            |
| `skip-comments`          | A `Boolean` if set to `true` then `action-jira-linter` will skip adding lint comments for PR title.                                                                                                                                                            |          | `false`         |
| `pr-threshold`           | An `Integer` based on which `action-jira-linter` will add a comment discouraging huge PRs.                                                                                                                                                                     |          | `800`           |
| `validate-issue-status`  | A `Boolean` based on which `action-jira-linter` will validate the status of the detected jira issue                                                                                                                                                            |          | `false`         |
| `allowed-issue-statuses` | A line-separated list of acceptable Jira issue statuses. The detected jira issue's status will be compared against this list and if a match is not found then the status check will fail. _Note_: Requires `validate-issue-status` to be set to `true`. |          | `'In Progress'` |
| `fail-on-error`          | A `Boolean` which, if set to `true`, fails the GitHub Action when an error occurs. Default `true`.                                                                                                                                                      |          | `true`         |

**Special note on `jira-token`:** Since tokens are private, we suggest adding
them as [GitHub secrets][secrets].

The Jira token is used to fetch issue information via the Jira REST API. To get
the token you need to:

1. Generate an [API token via JIRA][generate-jira-token].
2. Add the generated token as the secret `JIRA_TOKEN` in your GitHub project.

Note: The user needs to have the [required permissions (mentioned under GET
Issue)][jira-permissions].

### Skipping branches

Since GitHub actions take string inputs, `skip-branches` must be a regex which
will work for all sets of branches you want to ignore. This is useful for
merging protected/default branches into other branches. Check out some [examples
in the tests][example].

`action-jira-linter` already skips PRs which are filed by bots (for eg.
[dependabot]). You can add more bots to [this list][bot-pattern], or add the
branch-format followed by the bot PRs to the `skip-branches` option.

## Contributing

Follow the instructions [here][help-action] to know more about GitHub actions.

## FAQ

<details>
  <summary>Why is a Jira key required in the branch names?</summary>

The key is required in order to:

- Automate change-logs and release notes ⚙️.
- Automate alerts to QA/Product teams and other external stake-holders 🔊.
- Help us retrospect the sprint progress 📈.

</details>

<details>
  <summary>Is there a way to get around this?</summary>
  Nope 🙅

</details>

## Contributors

Thanks goes to these wonderful people ([emoji key][emoji-key]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://hacktivist.in"><img src="https://avatars3.githubusercontent.com/u/4851763?v=4" width="100px;" alt=""/><br /><sub><b>Raj Anand</b></sub></a><br /><a href="https://github.com/btwrk/action-jira-linter/commits?author=rajanand02" title="Code">💻</a> <a href="https://github.com/ClearTax/action-jira-linter/pulls?q=is%3Apr+reviewed-by%3Arajanand02" title="Reviewed Pull Requests">👀</a> <a href="#ideas-rajanand02" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://aditimohanty.com/?utm_source=github&utm_medium=documentation-allcontributors&utm_content=action-jira-linter"><img src="https://avatars3.githubusercontent.com/u/6426069?v=4" width="100px;" alt=""/><br /><sub><b>Aditi Mohanty</b></sub></a><br /><a href="https://github.com/ClearTax/action-jira-linter/commits?author=rheaditi" title="Code">💻</a> <a href="https://github.com/ClearTax/action-jira-linter/commits?author=rheaditi" title="Documentation">📖</a> <a href="#infra-rheaditi" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/dustman9000"><img src="https://avatars0.githubusercontent.com/u/3944352?v=4" width="100px;" alt=""/><br /><sub><b>Dustin Row</b></sub></a><br /><a href="https://github.com/btwrk/action-jira-linter/pulls?q=is%3Apr+reviewed-by%3Adustman9000" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://github.com/richardlhao"><img src="https://avatars1.githubusercontent.com/u/60636550?v=4" width="100px;" alt=""/><br /><sub><b>richardlhao</b></sub></a><br /><a href="https://github.com/btwrk/action-jira-linter/commits?author=richardlhao" title="Code">💻</a></td>
    <td align="center"><a href="https://www.nimeshjm.com/"><img src="https://avatars3.githubusercontent.com/u/2178497?v=4" width="100px;" alt=""/><br /><sub><b>Nimesh Manmohanlal</b></sub></a><br /><a href="https://github.com/btwrk/action-jira-linter/commits?author=nimeshjm" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/lwaddicor"><img src="https://avatars2.githubusercontent.com/u/10589338?v=4" width="100px;" alt=""/><br /><sub><b>Lewis Waddicor</b></sub></a><br /><a href="https://github.com/btwrk/action-jira-linter/commits?author=lwaddicor" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/btwrk"><img src="https://avatars.githubusercontent.com/u/12283?v=4" width="100px;" alt=""/><br /><sub><b>Asbjørn Ulsberg</b></sub></a><br /><a href="https://github.com/btwrk/action-jira-linter/commits?author=btwrk" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors] specification. Contributions of any
kind welcome!

[all-contributors-badge]: https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square
[all-contributors]: https://github.com/all-contributors/all-contributors
[bot-pattern]: https://github.com/btwrk/action-jira-linter/blob/08a47ab7a6e2bc235c9e34da1d14eacf9d810bd1/src/constants.ts#L4
[cleartax]: https://github.com/ClearTax
[codacy-badge]: https://app.codacy.com/project/badge/Grade/97d96de47b1e47bfa379951251eafe4f
[codacy]: https://www.codacy.com/gh/btwrk/action-jira-linter/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=btwrk/action-jira-linter&amp;utm_campaign=Badge_Grade
[codecov-badge]: https://codecov.io/gh/btwrk/action-jira-linter/branch/main/graph/badge.svg
[codecov]: https://codecov.io/gh/btwrk/action-jira-linter
[codeql-badge]: https://github.com/btwrk/action-jira-linter/workflows/CodeQL/badge.svg
[dependabot]: https://github.com/dependabot/dependabot-core
[emoji-key]: https://allcontributors.org/docs/en/emoji-key
[example]: https://github.com/btwrk/action-jira-linter/blob/08a47ab7a6e2bc235c9e34da1d14eacf9d810bd1/__tests__/utils.test.ts#L33-L44
[generate-jira-token]: https://confluence.atlassian.com/cloud/api-tokens-938839638.html
[ghtoken]: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
[help-action]: https://help.github.com/en/articles/creating-a-javascript-action#commit-and-push-your-action-to-github
[issue-types]: https://confluence.atlassian.com/adminjiracloud/issue-types-844500742.html
[jira-api]: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
[jira-lint]: https://github.com/ClearTax/jira-lint
[jira-permissions]: https://developer.atlassian.com/cloud/jira/platform/rest/v3/?utm_source=%2Fcloud%2Fjira%2Fplatform%2Frest%2F&utm_medium=302#api-rest-api-3-issue-issueIdOrKey-get
[jira]: https://www.atlassian.com/software/jira
[latest-release-badge]: https://img.shields.io/github/v/release/btwrk/jira-linter
[latest-release]: https://github.com/btwrk/action-jira-linter/releases/latest
[license-badge]: https://img.shields.io/github/license/btwrk/action-jira-linter
[license]: https://opensource.org/licenses/MIT
[pivotal-lint]: https://github.com/ClearTax/pivotal-lint/
[releases]: https://github.com/btwrk/action-jira-linter/releases
[secrets]: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets
[test-badge]: https://github.com/btwrk/action-jira-linter/workflows/test/badge.svg
