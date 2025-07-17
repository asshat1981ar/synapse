import asyncio
import logging
from fetcher import fetch_urls_in_parallel
from parser import HTMLParser
from tokenizer import tokenize_and_chunk
from db import RAGDatabase
from config import parse_args, load_parser_rules

async def main():
    args = parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level.upper()),
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)

    parser_rules = {}
    if args.parser_rules:
        try:
            parser_rules = load_parser_rules(args.parser_rules)
            logger.info(f"Loaded parser rules from {args.parser_rules}")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Error loading parser rules: {e}")
            return

    html_parser = HTMLParser(parser_rules)
    db = RAGDatabase(args.db_path)

    await db.connect()

    logger.info(f"Starting RAG population for {len(args.urls)} URLs...")
    fetched_contents = await fetch_urls_in_parallel(args.urls, args.concurrency)

    for url, html_content in fetched_contents:
        if html_content:
            logger.info(f"Processing {url}...")
            parsed_text = html_parser.parse_content(html_content, url)
            chunks = tokenize_and_chunk(parsed_text, args.chunk_size, args.overlap_ratio)
            await db.insert_document_and_chunks(url, url, chunks, args.batch_size) # Using URL as title for now
        else:
            logger.warning(f"Skipping {url} due to empty content or fetch error.")

    await db.disconnect()
    logger.info("RAG Population completed.")

if __name__ == "__main__":
    asyncio.run(main())
