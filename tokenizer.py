import spacy
import logging

logger = logging.getLogger(__name__)

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("Downloading spaCy model 'en_core_web_sm'...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def tokenize_and_chunk(text: str, chunk_size: int = 500, overlap_ratio: float = 0.2) -> list[str]:
    """Tokenizes text into sentences and then chunks them with overlap."""
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    chunks = []
    current_chunk_tokens = []
    current_chunk_len = 0
    overlap_tokens_count = int(chunk_size * overlap_ratio)

    for i, sentence in enumerate(sentences):
        sentence_tokens = nlp(sentence)
        sentence_len = len(sentence_tokens)

        if current_chunk_len + sentence_len <= chunk_size:
            current_chunk_tokens.extend(sentence_tokens)
            current_chunk_len += sentence_len
        else:
            # Save current chunk
            if current_chunk_tokens:
                chunks.append(current_chunk_tokens.text)

            # Start new chunk with overlap
            overlap_start_index = max(0, len(current_chunk_tokens) - overlap_tokens_count)
            current_chunk_tokens = list(current_chunk_tokens)[overlap_start_index:]
            current_chunk_len = len(current_chunk_tokens)
            
            current_chunk_tokens.extend(sentence_tokens)
            current_chunk_len += sentence_len

    if current_chunk_tokens: # Add the last chunk
        chunks.append(current_chunk_tokens.text)

    return chunks
