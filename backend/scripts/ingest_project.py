"""Ingest local project files into the SQLite-backed vector knowledge base."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.database import SessionLocal, init_db  # noqa: E402
from app.models import KnowledgeChunk  # noqa: E402,F401
from app.services.knowledge_indexer import KnowledgeIndexer  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Parse project files into a local vector knowledge base.")
    parser.add_argument("--root", default=str(ROOT), help="Directory to ingest. Defaults to the repo root.")
    parser.add_argument("--kb-id", default="project", help="Knowledge base id to write.")
    parser.add_argument("--chunk-size", type=int, default=1200, help="Maximum characters per chunk.")
    parser.add_argument("--chunk-overlap", type=int, default=180, help="Overlapping characters between chunks.")
    parser.add_argument("--no-clear", action="store_true", help="Append instead of replacing the KB id.")
    parser.add_argument("--query", default="", help="Optional query to test retrieval after ingestion.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    init_db()
    db = SessionLocal()
    try:
        indexer = KnowledgeIndexer(db)
        result = indexer.ingest_directory(
            args.root,
            kb_id=args.kb_id,
            chunk_size=args.chunk_size,
            chunk_overlap=args.chunk_overlap,
            clear_existing=not args.no_clear,
        )
        print(
            f"indexed_files={result.indexed_files} "
            f"chunks={result.chunk_count} "
            f"skipped_files={result.skipped_files} "
            f"kb_id={result.kb_id}"
        )
        if args.query:
            print("\nsearch_results:")
            for match in indexer.search(args.query, kb_id=args.kb_id, limit=5):
                preview = " ".join(match.content.split())[:140]
                print(f"- score={match.score:.4f} path={match.source_path} chunk={match.chunk_index} {preview}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
