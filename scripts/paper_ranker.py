"""
AI Paper Radar — pulls the newest papers across several arXiv AI categories,
ranks them against a fixed interest area using the Jev API (TypeSafe AI),
and writes the result to src/data/papers.json for the Astro site to render.

Ranking = 0.7 * worth_reading (Jev's yes/no confidence) + 0.3 * (novelty / 3)
Both signals come from Jev; the weighting is the only thing decided in Python.

Auth: reads JEV_API_KEY from the environment (set as a GitHub Actions
secret in CI). For local runs, falls back to a `.env` file at the repo root
(gitignored) containing a line like `jev_key=...`.

Run:
    python3 scripts/paper_ranker.py
"""

import datetime
import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

API_URL = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..")
ENV_PATH = os.path.join(REPO_ROOT, ".env")
OUTPUT_PATH = os.path.join(REPO_ROOT, "src", "data", "papers.json")

INTEREST = "LLM agents, tool use, and structured/typed model outputs"
ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG", "cs.MA"]
PAPERS_PER_CATEGORY = 15
TOP_N = 20

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


def load_api_key() -> str:
    env_key = os.environ.get("JEV_API_KEY")
    if env_key:
        return env_key
    with open(ENV_PATH) as f:
        for line in f:
            if line.strip().startswith("jev_key"):
                return line.strip().split("=", 1)[1]
    raise RuntimeError("JEV_API_KEY not set and no jev_key found in .env")


def fetch_recent_papers(category: str, max_results: int) -> list[dict]:
    params = {
        "search_query": f"cat:{category}",
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": str(max_results),
    }
    url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url) as resp:
        root = ET.fromstring(resp.read())

    papers = []
    for entry in root.findall("atom:entry", ATOM_NS):
        title = entry.find("atom:title", ATOM_NS).text.strip().replace("\n", " ")
        summary = entry.find("atom:summary", ATOM_NS).text.strip().replace("\n", " ")
        link = entry.find("atom:id", ATOM_NS).text.strip()
        published = entry.find("atom:published", ATOM_NS).text.strip()
        papers.append(
            {"title": title, "summary": summary, "link": link, "published": published, "category": category}
        )
    return papers


QUESTIONS = {
    "worth_reading": {
        "type": "noul",
        "instructions": f"Given the reader's interest area ({INTEREST}), is this paper worth reading?",
    },
    "novelty": {
        "type": "score",
        "instructions": "Based only on the title and abstract, how novel does this paper's core idea look?",
        "criteria": ["Incremental", "Solid iteration", "Notable new idea", "Potentially field-changing"],
    },
    "kind": {
        "type": "choice",
        "instructions": "What type of paper is this?",
        "criteria": {
            "new_method": "Proposes a new technique, architecture, or algorithm",
            "benchmark_or_eval": "Introduces or focuses on a benchmark, dataset, or evaluation",
            "survey_or_position": "Surveys existing work or argues a position, no new method",
            "applied_system": "Describes a built system or application using existing techniques",
        },
    },
}


def rank(api_key: str, state: str) -> dict:
    body = json.dumps({"state": state, "model": MODEL, "questions": QUESTIONS}).encode()
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def dedupe(papers: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for p in papers:
        if p["link"] in seen:
            continue
        seen.add(p["link"])
        out.append(p)
    return out


def main():
    api_key = load_api_key()

    all_papers = []
    for cat in ARXIV_CATEGORIES:
        all_papers.extend(fetch_recent_papers(cat, PAPERS_PER_CATEGORY))
    all_papers = dedupe(all_papers)
    print(f"Fetched {len(all_papers)} unique papers across {ARXIV_CATEGORIES}")

    scored = []
    for paper in all_papers:
        state = f"Title: {paper['title']}\n\nAbstract: {paper['summary']}"
        try:
            result = rank(api_key, state)
            a = result["answers"]
            worth_reading = a["worth_reading"]["noul"]
            novelty = a["novelty"]["score"]
            priority = 0.7 * worth_reading + 0.3 * (novelty / 3)
            scored.append(
                {
                    **paper,
                    "worth_reading": worth_reading,
                    "novelty": novelty,
                    "kind": a["kind"]["choice"],
                    "priority": round(priority, 4),
                }
            )
        except Exception as e:
            print(f"  (skipping \"{paper['title'][:60]}...\" — {e})")

    scored.sort(key=lambda p: p["priority"], reverse=True)
    top = scored[:TOP_N]

    output = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "interest": INTEREST,
        "categories": ARXIV_CATEGORIES,
        "papers": top,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(top)} ranked papers to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
