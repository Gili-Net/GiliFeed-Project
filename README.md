# GiliFeed Project

> **A Resilient, Decentralized, and Offline-Capable Web Feed Ecosystem.**

## Overview

The `GiliFeed Project` is a suite of tools designed to ensure the uninterrupted delivery of information ("Intel") across unpredictable, restricted, or decentralized networks. Built with survivalist architecture and PRISEC (Privacy and Security) principles in mind, the system aggressively mitigates CORS restrictions, network isolation, and server downtime.

---

## The Toolkit

The `GiliFeed` ecosystem is modular by design. It consists of four distinct components that can operate independently or be combined to form a complete, censorship-resistant feed reader.

**1. GFEngine(`gfengine.js`)**

The beating heart of the project. GFEngine is a powerful and resilient data-fetching engine designed to assume network failure as the default state.

* **Universal Translation**: `GFEngine` is capable of pulling all the mainstream feed formats, like `JSON/GiliFeed`, `XML/RSS` and `Atom`.
* **Aggressive Proxy Cycling**: Automatically routes requests through an array of fallback CORS proxies if direct fetches fail.
* **IPFS Native**: Seamlessly translates `ipfs://` protocol URIs into accessible gateway links.
* **Offline Fallback**: Automatically caches the latest intel to `localStorage` and serves it when the network goes dark.
* **DOMPurify Integration**: Sanitizes the feeds and user inputs, everything is in the code and the user is only needed to import the `DOMPurify` library to their app or website.

**2. GFParser(`gfparser.js`)**

A lightweight, fault tolerant parser module.

* **Primary**: Parses the optimized GiliFeed JSON syntax.
* **Fallback**: Natively translates legacy XML formats (RSS and Atom) into the unified GiliFeed object structure.
* **Namespace Handling**: Safely extracts rich content from complex XML namespaces (e.g., `content:encoded`).

**3. GFReader(`gfreader.html`)**

A standalone, fully client-side web application. It integrates the Engine and Parser into a responsive, 3-pane reading interface.

* **Zero-Backend Architecture**: Runs entirely in the browser. Can be hosted on GitHub Pages, IPFS, or loaded locally.
* **Security-First Rendering**: Utilizes `DOMPurify` to sanitize all incoming feed content, preventing XSS injection attacks.
* **State Obfuscation**: Optional Base64/URI encoding for local configuration and feed states to protect against casual over-the-shoulder snooping.

**4. GiliFeed Syntax(`syntax.json`)**: A minimalist, high-performance JSON schema designed specifically for decentralized distribution and low-bandwidth environments.

---

## Quick Start and Integration

### Using the GFReader

Simply open `gfreeader.html` in any modern web browser. No server setup is required. Use the **Config** menu to set your preferred CORS proxies and IPFS gateways.

### Integrating GFEngine

You can drop gfengine.js into any web project folder to power your own feed integrations with a simple plug-n-play line of code which takes barely 30 seconds.

```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>

<script src="gfengine.js"></script>

<gf-engine 
  feeds="https://example.com/rss, https://another-site.org/feed.xml" 
  max-items="10"
  cors-proxy="https://api.allorigins.win/raw?url=">
</gf-engine>
```

---

## Schema Specifications(GiliFeed Syntax)

For optimal performance for the parser, publishers should adopt the GiliFeed JSON structure:

```json
{
  "feed_title": "Project Updates",
  "feed_url": "https://example.com/feed.json",
  "description": "Latest intel and core updates.",
  "items": [
    {
      "id": "unique-id-001",
      "title": "Protocol v2 Released",
      "date": "2026-04-05",
      "content": "Full HTML content goes here...",
      "author": "The Core"
    }
  ]
}
```

---

## Contributing

Contributions to the engine, parser logic, or the reader are welcome. Security researchers (PRISEC) are encouraged to audit the parser and DOMPurify implementations and help us create a custom sanitizer for the engine.

## Security Vulnerability Report

If you find a bypass or vulnerability in this library, we request you to **not open a public issue**. Please refer to SECURITY.md for our responsible disclosure policy.

## License
This project is completely open source and is licensed under the **GNU General Public License v3**.

---

GiliFeed is Freeware: You can redistribute it and/or modify it under the terms of the **GNU General Public License v3**. This project comes **WITHOUT ANY WARRANTY**.
