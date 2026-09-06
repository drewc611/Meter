---
date: '2026-09-01'
category: tools
title: GitHub will let Copilot's code review formally approve pull requests
dek: >-
  The AI reviewer's sign-off can now satisfy a repository's required-approval
  rule, off by default -- a real shift from Copilot leaving advisory comments to
  Copilot holding merge authority, and one security analysts say teams need to
  measure before they flip it on broadly.
sources:
  - label: >-
      Copilot code review can now approve pull requests — GitHub Changelog
      (official)
    url: >-
      https://github.blog/changelog/2026-09-01-copilot-code-review-can-now-approve-pull-requests/
  - label: >-
      GitHub Puts Copilot in the Approval Seat for Pull Requests — DevOps.com
      (Tom Smith)
    url: >-
      https://devops.com/github-puts-copilot-in-the-approval-seat-for-pull-requests/
---
GitHub said on September 1, 2026 that Copilot's code review can now be configured to formally approve pull requests, with that approval counting toward a repository's required-approvals rule the same way a human reviewer's would. Copilot's review already ends with an assessment of whether a PR looks ready to merge; the new setting turns that assessment into a binding sign-off. Per GitHub's own changelog, the capability is off by default, controllable at the enterprise, organization, and repository level, and can be restricted to specific file paths -- and if new commits land after Copilot approves, that approval is automatically dismissed, just as a human's would be. It's in public preview for Copilot Pro, Pro+, Max, Business, and Enterprise plans.

## Where review stops being advice

DevOps.com's Tom Smith led his coverage with the actual stakes of the change, quoting Mitch Ashley of The Futurum Group: "Approval is where code review stops being advice and becomes authority." Ashley's fuller point, per the article, is that an automated reviewer should earn merge authority the same way a person does -- through outcomes a team can point to -- and that engineering leaders who turn the setting on should be instrumenting it to measure approval accuracy, not just enabling it and moving on.

That's close to the exact question this site's own tracker exists to make legible for AI spend generally: not whether a tool got used, but whether what it produced holds up. Here the stakes are sharper because the artifact in question is a merge decision. The feature is brand new and opt-in, so how many teams actually turn it on -- and what happens to their defect rates when they do -- is unknown at this point.
