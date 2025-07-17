import aiosqlite
import asyncio
import logging

logger = logging.getLogger(__name__)

class RAGDatabase:
    def __init__(self, db_path: str = "rag_data.db"):
        self.db_path = db_path
        self.pool = None

    async def connect(self):
        """Establishes a connection pool to the SQLite database."""
        # For aiosqlite, connection pooling is often managed implicitly or per-connection
        # For simplicity, we'll just open a connection when needed for now.
        # In a real-world scenario, consider a dedicated connection pool library if needed.
        logger.info(f"Connecting to database: {self.db_path}")
        self.conn = await aiosqlite.connect(self.db_path)
        await self.conn.execute("PRAGMA journal_mode=WAL;") # Improve concurrency
        await self.conn.execute("PRAGMA foreign_keys=ON;")
        await self.create_tables()

    async def create_tables(self):
        """Creates necessary tables if they don't exist."""
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                title TEXT,
                last_indexed_at TEXT
            );
        """)
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                chunk_text TEXT NOT NULL,
                chunk_order INTEGER NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );
        """)
        await self.conn.commit()
        logger.info("Database tables checked/created.")

    async def insert_document_and_chunks(self, url: str, title: str, chunks: list[str], batch_size: int = 100):
        """Inserts a document and its associated chunks in batches."""
        async with self.conn.cursor() as cursor:
            # Insert document, or update if URL already exists
            await cursor.execute("""
                INSERT INTO documents (url, title, last_indexed_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(url) DO UPDATE SET title=excluded.title, last_indexed_at=CURRENT_TIMESTAMP;
            """, (url, title))
            document_id = cursor.lastrowid

            # Delete existing chunks for this document to prevent duplicates on update
            await cursor.execute("DELETE FROM chunks WHERE document_id = ?;", (document_id,))

            # Prepare chunks for batch insertion
            chunk_data = [(document_id, chunk, i) for i, chunk in enumerate(chunks)]

            # Insert chunks in batches
            for i in range(0, len(chunk_data), batch_size):
                batch = chunk_data[i:i + batch_size]
                await cursor.executemany("""
                    INSERT INTO chunks (document_id, chunk_text, chunk_order) VALUES (?, ?, ?);
                """, batch)
                logger.debug(f"Inserted batch of {len(batch)} chunks for {url}")
            
            await self.conn.commit()
            logger.info(f"Successfully inserted/updated document and {len(chunks)} chunks for {url}")

    async def disconnect(self):
        """Closes the database connection."""
        if self.conn:
            await self.conn.close()
            logger.info("Database connection closed.")
