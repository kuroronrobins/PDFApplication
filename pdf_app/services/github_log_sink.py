from __future__ import annotations

import base64
import json
import time
from urllib import error, request
from urllib.parse import urlparse

from pdf_app.models import PDFApplicationError


GITHUB_API_BASE = "https://api.github.com"


def _open_github_request(req: request.Request, timeout: int = 20):
    parsed = urlparse(req.full_url)
    if parsed.scheme != "https" or parsed.netloc.lower() != "api.github.com":
        raise PDFApplicationError("Unexpected GitHub API URL")
    # Only GitHub API URLs reach this call; scheme and host are validated above.
    return request.urlopen(req, timeout=timeout)  # nosec B310


def _build_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "PDFApplication-usage-logger",
    }


def _get_file(repo: str, path: str, token: str, branch: str) -> tuple[str, str] | None:
    url = f"{GITHUB_API_BASE}/repos/{repo}/contents/{path}?ref={branch}"
    req = request.Request(url, headers=_build_headers(token), method="GET")
    try:
        with _open_github_request(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
            content = base64.b64decode(payload.get("content", "")).decode("utf-8")
            sha = payload["sha"]
            return content, sha
    except error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise PDFApplicationError(f"GitHubログ取得失敗: HTTP {exc.code}") from exc
    except (error.URLError, TimeoutError) as exc:
        raise PDFApplicationError(f"GitHubログ取得失敗: {exc}") from exc


def append_jsonl_to_github(repo: str, path: str, token: str, branch: str, line: str, max_retries: int = 3) -> None:
    if not line.endswith("\n"):
        line = f"{line}\n"

    for attempt in range(1, max_retries + 1):
        current = _get_file(repo, path, token, branch)
        existing_text = ""
        sha = None
        if current is not None:
            existing_text, sha = current

        updated_content = existing_text + line
        body: dict[str, str] = {
            "message": "chore: append PDFApplication usage log",
            "content": base64.b64encode(updated_content.encode("utf-8")).decode("utf-8"),
            "branch": branch,
        }
        if sha:
            body["sha"] = sha

        url = f"{GITHUB_API_BASE}/repos/{repo}/contents/{path}"
        req = request.Request(
            url,
            headers={**_build_headers(token), "Content-Type": "application/json"},
            data=json.dumps(body).encode("utf-8"),
            method="PUT",
        )
        try:
            with _open_github_request(req, timeout=20):
                return
        except error.HTTPError as exc:
            if exc.code == 409 and attempt < max_retries:
                time.sleep(0.5 * attempt)
                continue
            raise PDFApplicationError(f"GitHubログ追記失敗: HTTP {exc.code}") from exc
        except (error.URLError, TimeoutError) as exc:
            raise PDFApplicationError(f"GitHubログ追記失敗: {exc}") from exc

    raise PDFApplicationError("GitHubログ追記失敗: リトライ回数上限")
