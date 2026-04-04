class GFEngine {
    constructor(config) {
        // Core configuration with fallbacks
        this.containerId = config.container || 'gf-engine-root';
        this.feedUrls = config.feeds || [];
        
        // POWER-UP: Accept an array of proxies for aggressive fallbacks
        this.corsProxies = config.corsProxies || (config.corsProxy ? [config.corsProxy] : []);
        this.ipfsGateway = config.ipfsGateway || 'https://ipfs.io/ipfs/';
        this.maxItems = config.maxItems || 20;
        this.fetchTimeoutMs = config.fetchTimeoutMs || 8000; // 8 second timeout
        
        // Internal state
        this.items = [];
        this.cacheKey = `gfe_cache_${this.containerId}`;
        this.isOffline = false; 
    }

    async init() {
        const container = document.getElementById(this.containerId);
        
        if (!container) {
            console.error(`GFEngine: Container ID '${this.containerId}' not found on the page.`);
            return;
        }

        // FIX: Changed textContent to innerHTML to actually render the HTML
        container.innerHTML = `<div class="gfe-status">Syncing with the network...</div>`;

        await this.fetchFeeds();
        this.render(container);
    }

    // POWER-UP: Aggressive fetch with Timeout and Proxy Cycling
    async fetchWithResilience(targetUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

        // If no proxies are provided, try direct fetch
        const proxyList = this.corsProxies.length > 0 ? this.corsProxies : [''];

        for (let proxy of proxyList) {
            let fetchUrl = (proxy && targetUrl.startsWith('http'))
                ? proxy + encodeURIComponent(targetUrl)
                : targetUrl;

            try {
                const res = await fetch(fetchUrl, { signal: controller.signal });
                if (res.ok) {
                    clearTimeout(timeoutId);
                    return await res.text(); // Return raw text on success
                }
            } catch (err) {
                // Ignore and let it loop to the next proxy
                console.warn(`GFEngine: Proxy/Fetch failed for ${fetchUrl}. Trying next...`);
            }
        }
        
        clearTimeout(timeoutId);
        throw new Error(`All fetch attempts failed for ${targetUrl}`);
    }

    async fetchFeeds() {
        try {
            const fetchPromises = this.feedUrls.map(async (url) => {
                let targetUrl = url.startsWith('ipfs://') 
                    ? url.replace('ipfs://', this.ipfsGateway) 
                    : url;

                try {
                    const rawText = await this.fetchWithResilience(targetUrl);
                    const data = this.transformFeedData(rawText, url);
                    
                    const feedTitle = data.feed_title || url.split('/').pop() || 'Unknown Source';
                    return (data.items || []).map(item => ({
                        ...item,
                        sourceName: feedTitle,
                        _unixTime: item.date ? (new Date(item.date).getTime() || 0) : 0
                    }));
                } catch (error) {
                    console.warn(`GFEngine: Graceful degradation for ${url}`, error);
                    return []; // Graceful degradation
                }
            });

            const results = await Promise.all(fetchPromises);
            const fetchedItems = results.flat();

            if (fetchedItems.length > 0) {
                this.items = fetchedItems
                    .sort((a, b) => b._unixTime - a._unixTime)
                    .slice(0, this.maxItems);
                
                try {
                    localStorage.setItem(this.cacheKey, JSON.stringify(this.items));
                } catch (storageError) {
                    console.warn("GFEngine: Could not save to offline cache.");
                }
                
                this.isOffline = false;
            } else {
                throw new Error("Network isolated or all feeds failed to respond.");
            }

        } catch (criticalError) {
            console.warn(`GFEngine: ${criticalError.message} Attempting to load offline cache...`);
            
            try {
                const cachedData = localStorage.getItem(this.cacheKey);
                if (cachedData) {
                    this.items = JSON.parse(cachedData);
                    this.isOffline = true;
                } else {
                    this.items = [];
                }
            } catch (storageError) {
                 this.items = [];
            }
        }
    }

    render(container) {
        // FIX: Clear using innerHTML
        container.innerHTML = ''; 

        if (this.items.length === 0) {
            // FIX: innerHTML so the styling applies
            container.innerHTML = `<div class="gfe-status gfe-error">Network isolated. No cached intel available.</div>`;
            return;
        }

        const header = document.createElement('div');
        header.className = 'gfe-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = 'Latest Intel';
        header.appendChild(titleSpan);

        if (this.isOffline) {
            const badge = document.createElement('span');
            badge.className = 'gfe-offline-badge';
            badge.textContent = ' OFFLINE CACHE';
            badge.style.cssText = 'color: #ffaa00; font-size: 0.7em; margin-left: 12px; padding: 2px 6px; border: 1px solid #ffaa00; border-radius: 4px;';
            header.appendChild(badge);
        }

        container.appendChild(header);

        const listContainer = document.createElement('div');
        listContainer.className = 'gfe-list';

        this.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'gfe-item';
            
            const title = document.createElement('h4');
            title.className = 'gfe-title';
            title.textContent = item.title || "Untitled Entry";

            const meta = document.createElement('div');
            meta.className = 'gfe-meta';
            
            const dateStr = item._unixTime > 0 
                ? new Date(item._unixTime).toLocaleDateString() 
                : 'Unknown Date';
                
            const authorStr = item.author ? `by ${item.author}` : '';
            meta.textContent = `${dateStr} ${authorStr} — via ${item.sourceName}`;

            const content = document.createElement('div');
            content.className = 'gfe-content';
            
            if (window.DOMPurify) {
                // FIX: Used innerHTML instead of textContent so HTML renders
                content.innerHTML = DOMPurify.sanitize(item.content || '', { 
                    ADD_ATTR: ['target', 'rel'],
                    ADD_TAGS: ['a', 'p', 'br', 'b', 'i', 'strong', 'em', 'img'] 
                });
                
                content.querySelectorAll('a').forEach(link => {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                });
            } else {
                // Safe fallback if DOMPurify is missing
                content.textContent = item.content || '';
            }

            el.appendChild(title);
            el.appendChild(meta);
            el.appendChild(content);
            listContainer.appendChild(el);
        });

        container.appendChild(listContainer);
    }

    transformFeedData(rawText, sourceUrl) {
        try {
            const data = JSON.parse(rawText);
            if (data.items) return data; 
        } catch (e) {}

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawText, "text/xml");

        if (xmlDoc.querySelector("parsererror")) {
            console.warn(`GFEngine: Invalid XML/JSON format from ${sourceUrl}`);
            return { feed_title: 'Unknown Format', items: [] };
        }

        const isAtom = xmlDoc.querySelector("feed") !== null;
        const isRSS = xmlDoc.querySelector("rss") !== null || xmlDoc.querySelector("channel") !== null;

        if (!isAtom && !isRSS) {
            console.warn(`GFEngine: Unrecognized feed structure from ${sourceUrl}`);
            return { feed_title: 'Unrecognized Feed', items: [] };
        }

        const feedTitleNode = xmlDoc.querySelector("channel > title, feed > title");
        const feedTitle = feedTitleNode ? feedTitleNode.textContent : sourceUrl.split('/').pop();

        const entries = Array.from(xmlDoc.querySelectorAll(isAtom ? "entry" : "item"));
        const normalizedItems = entries.map(entry => {
            const getVal = (selector) => {
                const node = entry.querySelector(selector);
                return node ? node.textContent.trim() : '';
            };

            // POWER-UP: Handles XML namespaces (like content:encoded) properly
            const getNamespacedVal = (tagName) => {
                const nodes = entry.getElementsByTagNameNS('*', tagName);
                return nodes.length > 0 ? nodes[0].textContent.trim() : '';
            };

            let link = '';
            const linkNode = entry.querySelector("link");
            if (linkNode) {
                link = linkNode.getAttribute("href") || linkNode.textContent;
            }

            return {
                id: getVal("guid") || getVal("id") || link || Math.random().toString(36).substr(2, 9),
                title: getVal("title") || "Untitled",
                // POWER-UP: Fallback chain prefers full 'encoded' content over short descriptions
                content: getNamespacedVal("encoded") || getVal("description") || getVal("content") || getVal("summary") || "",
                date: getVal("pubDate") || getVal("updated") || getVal("published") || getVal("date") || "",
                author: getVal("author > name") || getNamespacedVal("creator") || getVal("author") || "",
                link: link
            };
        });

        return {
            feed_title: feedTitle,
            items: normalizedItems
        };
    }
}

window.GFEngine = GFEngine;

class GFEngineWidget extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.containerId = `gfe-${Math.random().toString(36).substr(2, 9)}`;
        // FIX: Changed textContent to innerHTML so the div is actually created in the DOM
        this.innerHTML = `<div id="${this.containerId}"></div>`;

        const feedsAttr = this.getAttribute('feeds');
        const feeds = feedsAttr ? feedsAttr.split(',').map(url => url.trim()) : [];
        
        const maxItems = parseInt(this.getAttribute('max-items'), 10) || 20;
        
        // Support single or multiple proxies via attribute
        const proxiesAttr = this.getAttribute('cors-proxies') || this.getAttribute('cors-proxy') || ''; 
        const corsProxies = proxiesAttr ? proxiesAttr.split(',').map(url => url.trim()) : [];

        if (typeof window.GFEngine !== 'undefined') {
            this.engine = new window.GFEngine({
                container: this.containerId,
                feeds: feeds,
                maxItems: maxItems,
                corsProxies: corsProxies // Passes array down
            });
            
            this.engine.init();
        }
    }
}

customElements.define('gf-engine', GFEngineWidget);