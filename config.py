import argparse
import json
import os

def load_parser_rules(rules_file: str) -> dict:
    """Loads domain-specific parser rules from a JSON file."""
    if not os.path.exists(rules_file):
        raise FileNotFoundError(f"Parser rules file not found: {rules_file}")
    with open(rules_file, 'r') as f:
        return json.load(f)

def parse_args():
    parser = argparse.ArgumentParser(description="RAG Population Script")
    parser.add_argument('--urls', nargs='+', required=True, help="List of URLs to process")
    parser.add_argument('--chunk_size', type=int, default=500, help="Size of text chunks")
    parser.add_argument('--overlap_ratio', type=float, default=0.2, help="Overlap ratio between chunks")
    parser.add_argument('--concurrency', type=int, default=10, help="Number of concurrent HTTP requests")
    parser.add_argument('--db_path', type=str, default="rag_data.db", help="Path to the SQLite database file")
    parser.add_argument('--parser_rules', type=str, help="Path to a JSON file with domain-specific parser rules")
    parser.add_argument('--batch_size', type=int, default=100, help="Batch size for database inserts")
    parser.add_argument('--log_level', type=str, default='INFO', help="Logging level (DEBUG, INFO, WARNING, ERROR)")
    return parser.parse_args()
