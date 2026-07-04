"""Local project-file ingestion for the knowledge base."""

from __future__ import annotations

import hashlib
import json
import math
import re
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.knowledge import KnowledgeAsset, KnowledgeChunk, KnowledgeIngestionJob


SUPPORTED_TEXT_EXTENSIONS = {
    ".css",
    ".csv",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".sql",
    ".ts",
    ".tsx",
    ".txt",
    ".vue",
    ".xml",
    ".yaml",
    ".yml",
}

DEFAULT_EXCLUDED_DIRS = {
    ".git",
    ".idea",
    ".venv",
    "__pycache__",
    "dist",
    "node_modules",
    "uploads",
}


@dataclass(frozen=True)
class TextChunk:
    index: int
    start: int
    end: int
    content: str


@dataclass(frozen=True)
class DirectoryIngestionResult:
    kb_id: str
    root: str
    indexed_files: int
    chunk_count: int
    skipped_files: int


@dataclass(frozen=True)
class SearchMatch:
    asset_id: str
    asset_title: str
    chunk_id: str
    chunk_index: int
    content: str
    score: float
    source_path: str


def chunk_text(text: str, chunk_size: int = 1200, chunk_overlap: int = 180) -> list[TextChunk]:
    normalized = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not normalized:
        return []
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks: list[TextChunk] = []
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        content = normalized[start:end].strip()
        if content:
            chunks.append(TextChunk(index=len(chunks), start=start, end=end, content=content))
        if end == len(normalized):
            break
        start = end - chunk_overlap
    return chunks


def tokenize(text: str) -> list[str]:
    lower = text.lower()
    latin_tokens = re.findall(r"[a-z0-9_]+", lower)
    cjk_tokens = re.findall(r"[\u4e00-\u9fff]", lower)
    return latin_tokens + cjk_tokens


class HashEmbeddingProvider:
    def __init__(self, dimensions: int = 256):
        self.dimensions = dimensions

    def embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        for token in tokenize(text):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


class KnowledgeIndexer:
    def __init__(self, db: Session, embedding_provider: HashEmbeddingProvider | None = None):
        self.db = db
        self.embedding_provider = embedding_provider or HashEmbeddingProvider()

    def ingest_directory(
        self,
        root: str | Path,
        kb_id: str = "project",
        chunk_size: int = 1200,
        chunk_overlap: int = 180,
        clear_existing: bool = True,
    ) -> DirectoryIngestionResult:
        root_path = Path(root).resolve()
        if not root_path.exists() or not root_path.is_dir():
            raise ValueError(f"Directory does not exist: {root_path}")

        if clear_existing:
            self._clear_kb(kb_id)

        indexed_files = 0
        chunk_count = 0
        skipped_files = 0
        for file_path in self._iter_supported_files(root_path):
            relative_path = file_path.relative_to(root_path).as_posix()
            content = self._read_text(file_path)
            if not content.strip():
                skipped_files += 1
                continue

            chunks = chunk_text(content, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            if not chunks:
                skipped_files += 1
                continue

            asset = KnowledgeAsset(
                id=str(uuid.uuid4()),
                kb_id=kb_id,
                asset_type="file",
                title=relative_path,
                status="ingesting",
            )
            job = KnowledgeIngestionJob(
                id=str(uuid.uuid4()),
                asset=asset,
                status="embedding",
                started_at=datetime.utcnow(),
            )
            self.db.add(asset)
            self.db.add(job)

            for chunk in chunks:
                embedding = self.embedding_provider.embed(chunk.content)
                self.db.add(
                    KnowledgeChunk(
                        id=str(uuid.uuid4()),
                        asset=asset,
                        kb_id=kb_id,
                        source_path=relative_path,
                        chunk_index=chunk.index,
                        content=chunk.content,
                        embedding=json.dumps(embedding, ensure_ascii=False),
                        token_count=len(tokenize(chunk.content)),
                    )
                )

            asset.status = "ready"
            asset.updated_at = datetime.utcnow()
            job.status = "done"
            job.chunk_count = len(chunks)
            job.finished_at = datetime.utcnow()
            indexed_files += 1
            chunk_count += len(chunks)

        self.db.commit()
        return DirectoryIngestionResult(
            kb_id=kb_id,
            root=str(root_path),
            indexed_files=indexed_files,
            chunk_count=chunk_count,
            skipped_files=skipped_files,
        )

    def search(self, query: str, kb_id: str = "project", limit: int = 5) -> list[SearchMatch]:
        query_embedding = self.embedding_provider.embed(query)
        rows = (
            self.db.query(KnowledgeChunk, KnowledgeAsset)
            .join(KnowledgeAsset, KnowledgeChunk.asset_id == KnowledgeAsset.id)
            .filter(KnowledgeChunk.kb_id == kb_id)
            .all()
        )
        matches: list[SearchMatch] = []
        for chunk, asset in rows:
            embedding = json.loads(chunk.embedding)
            score = cosine_similarity(query_embedding, embedding)
            matches.append(
                SearchMatch(
                    asset_id=asset.id,
                    asset_title=asset.title,
                    chunk_id=chunk.id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    score=score,
                    source_path=chunk.source_path,
                )
            )
        return sorted(matches, key=lambda item: item.score, reverse=True)[:limit]

    def _clear_kb(self, kb_id: str) -> None:
        assets = self.db.query(KnowledgeAsset).filter(KnowledgeAsset.kb_id == kb_id).all()
        for asset in assets:
            self.db.delete(asset)
        self.db.flush()

    def _iter_supported_files(self, root: Path) -> Iterable[Path]:
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            relative_parts = path.relative_to(root).parts
            if any(part in DEFAULT_EXCLUDED_DIRS for part in relative_parts[:-1]):
                continue
            if path.suffix.lower() not in SUPPORTED_TEXT_EXTENSIONS:
                continue
            yield path

    def _read_text(self, path: Path) -> str:
        try:
            return path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return path.read_text(encoding="utf-8", errors="ignore")
