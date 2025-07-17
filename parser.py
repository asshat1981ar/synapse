from bs4 import BeautifulSoup
import json
import logging
import re

logger = logging.getLogger(__name__)

class HTMLParser:
    def __init__(self, rules_file: str = None):
        self.rules = {}
        if rules_file:
            try:
                with open(rules_file, 'r') as f:
                    self.rules = json.load(f)
            except FileNotFoundError:
                logger.warning(f"Rules file not found: {rules_file}. Using default parsing.")
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in rules file: {rules_file}. Using default parsing.")

    def _get_rules_for_url(self, url: str) -> dict:
        """Finds the most specific parsing rules for a given URL."""
        best_match_rules = {}
        best_match_len = -1
        for pattern, rules in self.rules.items():
            if re.search(pattern, url):
                if len(pattern) > best_match_len: # More specific match
                    best_match_rules = rules
                    best_match_len = len(pattern)
        return best_match_rules

    def parse_content(self, html_content: str, url: str = None) -> str:
        """Parses HTML content based on URL-specific rules or falls back to default."""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        if url:
            site_rules = self._get_rules_for_url(url)
            if site_rules:
                if 'css_selector' in site_rules:
                    elements = soup.select(site_rules['css_selector'])
                    return '\n'.join([elem.get_text(separator=' ', strip=True) for elem in elements])
                elif 'xpath' in site_rules: # Requires lxml, not default for BeautifulSoup
                    try:
                        from lxml import html
                        tree = html.fromstring(html_content)
                        elements = tree.xpath(site_rules['xpath'])
                        return '\n'.join([elem.text_content().strip() for elem in elements])
                    except ImportError:
                        logger.warning("lxml not installed. Cannot use XPath rules. Falling back to default.")
                    except Exception as e:
                        logger.error(f"Error applying XPath rule for {url}: {e}. Falling back to default.")

        # Default to extracting all paragraph text if no specific rules or rules fail
        paragraphs = soup.find_all('p')
        return '\n'.join([p.get_text(separator=' ', strip=True) for p in paragraphs])
