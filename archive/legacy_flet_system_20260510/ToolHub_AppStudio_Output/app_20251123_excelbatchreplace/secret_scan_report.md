# Secret Scan Report

The following findings require human review before registration.

| Severity | Kind | Path | Detail |
| --- | --- | --- | --- |
| high | content | app.py | Sensitive content pattern matched: password\s*= |
| high | content | pdf_app\services\business.py | Sensitive content pattern matched: password\s*= |
| high | content | pdf_app\services\header_footer.py | Sensitive content pattern matched: password\s*= |
| high | content | pdf_app\services\page_workspace.py | Sensitive content pattern matched: password\s*= |
| high | content | pdf_app\services\pdf_ops.py | Sensitive content pattern matched: password\s*= |
| high | content | pdf_app\services\text_edit.py | Sensitive content pattern matched: password\s*= |
| high | content | pdf_app\services\usage_log.py | Sensitive content pattern matched: token\s*= |

High severity findings block Apply by default.
