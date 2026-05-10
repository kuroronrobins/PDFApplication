# Secret Scan Report

## Summary

- total findings: 6
- blocking findings: 0
- warning findings: 6
- manual check findings: 6
- false positive candidates: 0
- included package findings: 6
- excluded findings: 0
- AI submission blocked: true
- Apply blocked: false

Secret scan remains enabled. Apply is blocked only when a finding can affect the packaged app, AI submission safety, or cannot be proven excluded.

## Blocking Findings

none

## Warnings / Manual Checks

| Severity | Kind | Path | Inventory | Included | Blocks Apply | Detail | Reason | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| medium | manual-check-secret-assignment | app.py | include | true | false | password has a non-empty value that is not clearly a placeholder. | not a high severity finding | manual_check: verify this value is not a real credential before distribution. |
| medium | manual-check-secret-assignment | pdf_app/services/header_footer.py | include | true | false | password has a non-empty value that is not clearly a placeholder. | not a high severity finding | manual_check: verify this value is not a real credential before distribution. |
| medium | manual-check-secret-assignment | pdf_app/services/page_workspace.py | include | true | false | password has a non-empty value that is not clearly a placeholder. | not a high severity finding | manual_check: verify this value is not a real credential before distribution. |
| medium | manual-check-secret-assignment | pdf_app/services/pdf_ops.py | include | true | false | password has a non-empty value that is not clearly a placeholder. | not a high severity finding | manual_check: verify this value is not a real credential before distribution. |
| medium | manual-check-secret-assignment | pdf_app/services/text_edit.py | include | true | false | password has a non-empty value that is not clearly a placeholder. | not a high severity finding | manual_check: verify this value is not a real credential before distribution. |
| medium | manual-check-secret-assignment | pdf_app/services/usage_log.py | include | true | false | token has a non-empty value that is not clearly a placeholder. | not a high severity finding | manual_check: verify this value is not a real credential before distribution. |

## Excluded from Package

none

## False Positive Candidates

none

## Recommended Actions

- Remove real secrets from source files and load them from environment variables or a credential store at runtime.
- Keep placeholders explicit, for example `<your key>` or `dummy`, when documenting configuration.
- Keep logs, sessions, screenshots, `.auth`, storage state, cookies, and temp files outside packaged inputs.
- If `.auth`, storage state, cookie, session, token, or credential files must exist during development, explicitly exclude them in `.toolhubignore`; App Studio will still record the exclusion in file_inventory_report.md.
- If a warning is intentionally excluded, confirm it is not referenced by build_profile.add_data.

