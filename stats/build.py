"""Generate the NovaCode dashboard from public GitHub repository data."""

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from urllib.request import Request, urlopen

REPOS = {
    "Back-end": "wsernam/A-Walking-Dictionary-NovaCode-Back-end",
    "Front-end": "knnsand/A-Walking-Dictionary-NovaCode-Front-end",
}
MEMBERS = {
    "wsernam": "William",
    "thaliabernalepe": "Thalía",
    "manuelae08": "Manuela",
    "knnsand": "Karen",
}
STATES = {"open": "Abiertos", "closed": "Cerrados sin fusionar", "merged": "Fusionados"}
UNLINKED = "(sin cuenta vinculada)"


def pages(repo, endpoint, query=""):
    url = f"https://api.github.com/repos/{repo}/{endpoint}?per_page=100{query}"
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "NovaCode-stats",
    }
    front_token = os.environ.get("NOVACODE_FRONT_READ_TOKEN") if repo == REPOS["Front-end"] else None
    if token := front_token or os.environ.get("GH_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    while url:
        with urlopen(Request(url, headers=headers), timeout=30) as response:
            yield from json.load(response)
            next_link = re.search(
                r'<(https://api\.github\.com/[^>]+)>; rel="next"',
                response.headers.get("Link", ""),
            )
        url = next_link[1] if next_link else None


def actor(user):
    if not user:
        return UNLINKED
    login = user["login"].lower()
    return None if user["type"] == "Bot" or login.endswith("[bot]") else login


def first_parent(commits):
    commits = iter(commits)
    tip = next(commits)
    by_sha = {commit["sha"]: commit for commit in commits}
    commit = tip
    while True:
        yield commit
        if not commit["parents"]:
            break
        commit = by_sha[commit["parents"][0]["sha"]]


def collect(repo):
    prs = {pr["number"]: pr for pr in pages(repo, "pulls", "&state=all")}
    by_author = {}
    bots = 0
    for pr in prs.values():
        login = actor(pr["user"])
        if login is None:
            bots += 1
            continue
        state = "merged" if pr["merged_at"] else pr["state"]
        by_author.setdefault(login, Counter())[state] += 1

    merged_into_develop = {
        number for number, pr in prs.items()
        if pr["merged_at"] and pr["base"]["ref"] == "develop"
    }
    merge_shas = {prs[number]["merge_commit_sha"] for number in merged_into_develop}
    direct = Counter()
    for commit in first_parent(pages(repo, "commits", "&sha=develop")):
        sha = commit["sha"]
        if len(commit["parents"]) > 1 or sha in merge_shas:
            continue
        login = actor(commit["author"])
        if login is None:
            continue
        if any(pr["number"] in merged_into_develop for pr in pages(repo, f"commits/{sha}/pulls")):
            continue
        direct[login] += 1
    return by_author, bots, direct


def render_repo(title, repo, by_author, bots, direct):
    totals = Counter()
    for counts in by_author.values():
        totals.update(counts)
    total = totals.total()
    members = list(MEMBERS) + sorted((by_author.keys() | direct.keys()) - MEMBERS.keys())
    rows = []
    for login in members:
        counts = by_author.get(login, Counter())
        share = 100 * counts.total() / total if total else 0
        cells = "".join(f"<td>{counts[state]}</td>" for state in STATES)
        name = f"{MEMBERS[login]} · @{login}" if login in MEMBERS else login
        rows.append(
            f'<tr><th scope="row">{escape(name)}</th>{cells}<td>{counts.total()}</td>'
            f'<td><meter min="0" max="100" value="{share:.2f}"></meter> {share:.1f} %</td>'
            f'<td>{direct[login]}</td></tr>'
        )
    labels = "".join(f'<th scope="col">{label}</th>' for label in STATES.values())
    sums = "".join(f"<td>{totals[state]}</td>" for state in STATES)
    return f"""
    <section>
      <h2><a href="https://github.com/{repo}/pulls">{title}</a></h2>
      <p>{total} PR de cuentas no identificadas como bots · {bots} PR de bots excluidos</p>
      <div class="scroll"><table aria-label="Estadísticas de {title}">
      <thead><tr><th scope="col">Autor</th>{labels}<th scope="col">Total PR</th>
      <th scope="col">% de PR</th><th scope="col">Commits directos a develop*</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
      <tfoot><tr><th scope="row">Total</th>{sums}<td>{total}</td>
      <td>{100 if total else 0} %</td><td>{direct.total()}</td></tr></tfoot>
      </table></div>
    </section>
    """


def main():
    sections = []
    summary = ["## Estadísticas de NovaCode", "", "| Repositorio | PR sin bots | PR de bots | Commits directos (estimación) |", "|---|---:|---:|---:|"]
    for title, repo in REPOS.items():
        by_author, bots, direct = collect(repo)
        sections.append(render_repo(title, repo, by_author, bots, direct))
        summary.append(f"| {title} | {sum(counts.total() for counts in by_author.values())} | {bots} | {direct.total()} |")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    template = Path(__file__).with_name("index.html").read_text(encoding="utf-8")
    destination = Path("_site")
    destination.mkdir(exist_ok=True)
    (destination / "index.html").write_text(
        template.replace("{{UPDATED}}", now).replace("{{STATS}}", "\n".join(sections)),
        encoding="utf-8",
    )
    if path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(path, "a", encoding="utf-8") as output:
            output.write("\n".join(summary) + "\n")


if __name__ == "__main__":
    main()


