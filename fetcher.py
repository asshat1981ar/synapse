import aiohttp
import asyncio
import logging

logger = logging.getLogger(__name__)

async def fetch_url(session: aiohttp.ClientSession, url: str, retries: int = 3, backoff_factor: float = 0.5) -> str:
    """Fetches content from a URL with retries and exponential backoff."""
    for attempt in range(retries):
        try:
            async with session.get(url, raise_for_status=True) as response:
                return await response.text()
        except aiohttp.ClientError as e:
            logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
            if attempt < retries - 1:
                await asyncio.sleep(backoff_factor * (2 ** attempt))
            else:
                logger.error(f"Failed to fetch {url} after {retries} attempts.")
                raise
    return "" # Should not be reached

async def fetch_urls_in_parallel(urls: list[str], concurrency_limit: int = 10) -> list[tuple[str, str]]:
    """Fetches multiple URLs in parallel with a concurrency limit."""
    semaphore = asyncio.Semaphore(concurrency_limit)
    results = []

    async def _fetch_single(session: aiohttp.ClientSession, url: str):
        async with semaphore:
            try:
                content = await fetch_url(session, url)
                results.append((url, content))
            except Exception:
                results.append((url, "")) # Append empty string for failed fetches

    async with aiohttp.ClientSession() as session:
        tasks = [_fetch_single(session, url) for url in urls]
        await asyncio.gather(*tasks)
    return results
