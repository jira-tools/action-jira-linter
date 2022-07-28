import { GitHub } from "../src/github";
import { HIDDEN_MARKER } from "../src/constants";

jest.spyOn(console, "log").mockImplementation(); // avoid actual console.log in test output

describe("shouldSkipBranchLint()", () => {
  it("should recognize bot PRs", () => {
    expect(GitHub.shouldSkipBranchLint("dependabot")).toBe(true);
    expect(
      GitHub.shouldSkipBranchLint(
        "dependabot/npm_and_yarn/types/react-dom-16.9.6",
      ),
    ).toBe(true);
    expect(GitHub.shouldSkipBranchLint("feature/add-dependabot-config")).toBe(
      false,
    );
    expect(GitHub.shouldSkipBranchLint("feature/add-dependabot-config-OSS-101"))
      .toBe(false);

    expect(GitHub.shouldSkipBranchLint("all-contributors")).toBe(true);
    expect(GitHub.shouldSkipBranchLint("all-contributors/add-ghost")).toBe(
      true,
    );
    expect(GitHub.shouldSkipBranchLint("chore/add-all-contributors")).toBe(
      false,
    );
    expect(GitHub.shouldSkipBranchLint("chore/add-all-contributors-OSS-102"))
      .toBe(false);
  });

  it("should handle custom ignore patterns", () => {
    expect(GitHub.shouldSkipBranchLint("bar", "^bar")).toBeTruthy();
    expect(GitHub.shouldSkipBranchLint("foobar", "^bar")).toBeFalsy();

    expect(GitHub.shouldSkipBranchLint("bar", "[0-9]{2}")).toBeFalsy();
    expect(GitHub.shouldSkipBranchLint("bar", "")).toBeFalsy();
    expect(GitHub.shouldSkipBranchLint("foo", "[0-9]{2}")).toBeFalsy();
    expect(GitHub.shouldSkipBranchLint("f00", "[0-9]{2}")).toBeTruthy();

    const customBranchRegex = "^(production-release|master|release/v\\d+)$";
    expect(GitHub.shouldSkipBranchLint("production-release", customBranchRegex))
      .toBeTruthy();
    expect(GitHub.shouldSkipBranchLint("master", customBranchRegex))
      .toBeTruthy();
    expect(GitHub.shouldSkipBranchLint("release/v77", customBranchRegex))
      .toBeTruthy();

    expect(
      GitHub.shouldSkipBranchLint(
        "release/very-important-feature",
        customBranchRegex,
      ),
    ).toBeFalsy();
    expect(GitHub.shouldSkipBranchLint("masterful", customBranchRegex))
      .toBeFalsy();
    expect(GitHub.shouldSkipBranchLint("productionish", customBranchRegex))
      .toBeFalsy();
    expect(
      GitHub.shouldSkipBranchLint("fix/production-issue", customBranchRegex),
    ).toBeFalsy();
    expect(
      GitHub.shouldSkipBranchLint(
        "chore/rebase-with-master",
        customBranchRegex,
      ),
    ).toBeFalsy();
    expect(
      GitHub.shouldSkipBranchLint(
        "chore/rebase-with-release",
        customBranchRegex,
      ),
    ).toBeFalsy();
    expect(
      GitHub.shouldSkipBranchLint(
        "chore/rebase-with-release/v77",
        customBranchRegex,
      ),
    ).toBeFalsy();
  });

  it("should return false with empty input", () => {
    expect(GitHub.shouldSkipBranchLint("")).toBeFalsy();
  });

  it("should return false for other branches", () => {
    expect(GitHub.shouldSkipBranchLint("feature/awesomeNewFeature"))
      .toBeFalsy();
  });
});

describe("getHotFixLabel()", () => {
  it("should return empty string for master branch", () => {
    expect(GitHub.getHotfixLabel("master")).toEqual("");
  });

  it("should return HOTFIX-PROD for production branch", () => {
    expect(GitHub.getHotfixLabel("production-release")).toEqual(
      GitHub.LABELS.HOTFIX_PROD,
    );
  });

  it("should return HOTFIX-PRE-PROD for release branch", () => {
    expect(GitHub.getHotfixLabel("release/v")).toEqual(
      GitHub.LABELS.HOTFIX_PRE_PROD,
    );
  });

  it("should return empty string with no input", () => {
    expect(GitHub.getHotfixLabel("")).toEqual("");
  });
});

describe("shouldUpdatePRDescription()", () => {
  it("should return false when the hidden marker is present", () => {
    expect(GitHub.shouldUpdatePRDescription(HIDDEN_MARKER)).toBeFalsy();
    expect(
      GitHub.shouldUpdatePRDescription(`
<details open>
  <summary> <strong>ESCH-10</strong></summary>
  <br />
  <table>
    <tr>
      <td>Type</td>
      <td>feature</td>
    </tr>
    <tr>
      <td>Points</td>
      <td>2</td>
    </tr>
    <tr>
      <td>Labels</td>
      <td>fe tech goodness, gst 2.0</td>
    </tr>
  </table>
</details>
<!--
  do not remove this marker as it will break jira-lint's functionality.
  ${HIDDEN_MARKER}
-->

some actual content'
    `),
    ).toBeFalsy();
  });

  it("should return true when the hidden marker is NOT present", () => {
    expect(GitHub.shouldUpdatePRDescription("")).toBeTruthy();
    expect(GitHub.shouldUpdatePRDescription("added_by")).toBeTruthy();
    expect(GitHub.shouldUpdatePRDescription("added_by_something_else"))
      .toBeTruthy();
    expect(
      GitHub.shouldUpdatePRDescription(`
## Checklist

- [ ] PR is up-to-date with a description of changes and screenshots (if applicable).
- [ ] All files are lint-free.
- [ ] Added tests for the core-changes (as applicable).
- [ ] Tested locally for regressions & all test cases are passing.
`),
    ).toBeTruthy();
  });
});

describe("isHumongousPR()", () => {
  it("should return true if additions are greater than the threshold", () => {
    expect(GitHub.isHumongousPR(2000, 500)).toBeTruthy();
  });

  it("should return false if additions are less than the threshold", () => {
    expect(GitHub.isHumongousPR(200, 500)).toBeFalsy();
  });

  it("should return false with erroneous inputs", () => {
    expect(GitHub.isHumongousPR(NaN, NaN)).toBeFalsy();
  });
});

describe("getHugePrComment()", () => {
  it("should return the comment content with additions and threshold", () => {
    expect(GitHub.getHugePrComment(1000, 800)).toContain("1000");
    expect(GitHub.getHugePrComment(1000, 800)).toContain("800");
  });
});
