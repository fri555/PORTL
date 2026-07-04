import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.knowledge import KnowledgeAsset
from app.services.knowledge_indexer import (
    DirectoryIngestionResult,
    KnowledgeIndexer,
    chunk_text,
)


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    return session_factory()


class KnowledgeVectorIndexTest(unittest.TestCase):
    def test_chunk_text_keeps_overlap_between_chunks(self):
        text = "ABCDEFGHIJ" * 8

        chunks = chunk_text(text, chunk_size=30, chunk_overlap=6)

        self.assertEqual(len(chunks), 4)
        self.assertTrue(chunks[0].content.endswith(chunks[1].content[:6]))
        self.assertEqual(chunks[1].index, 1)
        self.assertEqual(chunks[1].start, 24)

    def test_ingest_directory_indexes_supported_files_and_skips_noise(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "project"
            project.mkdir()
            (project / "docs").mkdir()
            (project / "docs" / "prd.md").write_text("# 知识中心\n支持文件解析和问答。", encoding="utf-8")
            (project / "node_modules").mkdir()
            (project / "node_modules" / "ignored.md").write_text("不要索引", encoding="utf-8")
            (project / "image.png").write_bytes(b"\x89PNG\r\n")

            db = make_session()
            result = KnowledgeIndexer(db).ingest_directory(project, kb_id="project")

            self.assertIsInstance(result, DirectoryIngestionResult)
            self.assertEqual(result.indexed_files, 1)
            self.assertEqual(result.chunk_count, 1)
            asset = db.query(KnowledgeAsset).one()
            self.assertEqual(asset.title, "docs/prd.md")
            self.assertEqual(asset.status, "ready")

    def test_search_returns_most_relevant_chunk(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "project"
            project.mkdir()
            (project / "supply.md").write_text("组货专家 智能补货 供应链 采购计划", encoding="utf-8")
            (project / "portal.md").write_text("AI 工作门户 首页 工作台 消息中心", encoding="utf-8")

            db = make_session()
            indexer = KnowledgeIndexer(db)
            indexer.ingest_directory(project, kb_id="project")

            matches = indexer.search("采购和供应链怎么规划", kb_id="project", limit=2)

            self.assertEqual(matches[0].asset_title, "supply.md")
            self.assertGreater(matches[0].score, matches[1].score)

    def test_ingest_directory_can_rebuild_same_kb_id(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "project"
            project.mkdir()
            (project / "first.md").write_text("第一版 知识库 内容", encoding="utf-8")

            db = make_session()
            indexer = KnowledgeIndexer(db)
            first = indexer.ingest_directory(project, kb_id="project")

            (project / "first.md").write_text("第二版 知识库 内容", encoding="utf-8")
            second = indexer.ingest_directory(project, kb_id="project")

            self.assertEqual(first.indexed_files, 1)
            self.assertEqual(second.indexed_files, 1)
            self.assertEqual(db.query(KnowledgeAsset).count(), 1)


if __name__ == "__main__":
    unittest.main()
