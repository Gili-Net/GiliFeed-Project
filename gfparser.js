/**
 * GiliFeedParser
 * A specialized parser for the GiliFeed JSON syntax with 
 * legacy support for standard RSS/Atom XML feeds.
 */
class GiliFeedParser {
  /**
   * Main entry point for parsing feed data
   * @param {string} rawText - The raw string content from the feed source
   * @returns {Object} Structured feed data
   */
  parse(rawText) {
    try {
      const data = JSON.parse(rawText);
      
      // Strict check for your specific JSON syntax
      if (data && typeof data === 'object' && Array.isArray(data.items)) {
        return this._parseGiliJSON(data);
      }
      
      // If it's JSON but doesn't match GiliFeed schema, 
      // we throw to trigger the XML fallback.
      throw new Error("JSON does not match GiliFeed schema");
      
    } catch (e) {
      // Fallback to XML (RSS/Atom)
      return this._parseXML(rawText);
    }
  }

  /**
   * Internal: Parses the specific GiliFeed JSON structure
   */
  _parseGiliJSON(data) {
  return {
    type: 'json',
    title: data.feed_title || "Untitled GiliFeed",
    description: data.description || "",
    home_page_url: data.feed_url || "",
    items: data.items.map(item => ({
      id: item.id || this._generateSimpleHash(item.title + item.date),
      title: item.title || "Untitled Entry",
      content: item.content || "",
      url: item.link || item.url || "", 
      date_published: item.date || new Date().toISOString(),
      author: item.author || item.author_name || "Unknown" 
    }))
  };
}

  /**
   * Internal: Parses standard RSS/Atom XML structures
   */
  _parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const isAtom = xmlDoc.getElementsByTagName("feed").length > 0;

    const feedTitle = isAtom 
      ? xmlDoc.querySelector("title")?.textContent 
      : xmlDoc.querySelector("channel > title")?.textContent;

    const nodes = isAtom 
      ? xmlDoc.getElementsByTagName("entry") 
      : xmlDoc.getElementsByTagName("item");

    const items = Array.from(nodes).map(node => {
      return {
        id: node.querySelector("id, guid")?.textContent || this._generateSimpleHash(node.textContent),
        title: node.querySelector("title")?.textContent || "Untitled XML Entry",
        content: this._getNamespacedVal(node, "content:encoded") || node.querySelector("description, summary")?.textContent || "",
        url: isAtom ? node.querySelector("link")?.getAttribute("href") : node.querySelector("link")?.textContent,
        date_published: node.querySelector("pubDate, updated, published")?.textContent || "",
        author: this._getNamespacedVal(node, "dc:creator") || node.querySelector("author name")?.textContent || ""
      };
    });

    return {
      type: 'xml',
      title: feedTitle || "Untitled XML Feed",
      items: items
    };
  }

  /**
   * Helper: Extracts content from namespaced XML tags (e.g., content:encoded)
   */
  _getNamespacedVal(node, tagName) {
    return node.getElementsByTagName(tagName)[0]?.textContent || null;
  }

  /**
   * Helper: Generates a consistent ID when one isn't provided
   */
  _generateSimpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; 
    }
    return "gen-" + Math.abs(hash).toString(36);
  }
}

// Export for use in other modules
export default GiliFeedParser;