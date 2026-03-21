export class DOMExtractor {
  static extractPageContext(scopeSelector?: string): { url: string; title: string; dom: string } {
    return {
      url: window.location.href,
      title: document.title,
      dom: this.extractDOM(scopeSelector)
    };
  }

  static extractDOM(scopeSelector?: string): string {
    const root = scopeSelector
      ? this.getScopedRoot(scopeSelector)
      : document.body;

    if (!root) return '';

    const interactiveSection = this.extractInteractiveElements(root);

    const contentSection = this.extractTextContent(root);

    const structureSection = this.extractStructure(root, 0, 6, 4000);

    return `=== INTERACTIVE ELEMENTS ===\n${interactiveSection}\n\n=== PAGE TEXT CONTENT ===\n${contentSection}\n\n=== PAGE STRUCTURE ===\n${structureSection}`;
  }

  private static getScopedRoot(scopeSelector: string): Element | null {
    const elements = document.querySelectorAll(scopeSelector);
    if (elements.length === 0) return document.body;
    if (elements.length === 1) return elements[0];
    const container = document.createElement('div');
    elements.forEach(el => container.appendChild(el.cloneNode(true)));
    return container;
  }

  private static extractInteractiveElements(root: Element): string {
    const controlSelectors = [
      'form',
      'input', 'textarea', 'select',
      'button', '[role="button"]',
      '[role="searchbox"]', '[role="textbox"]', '[role="combobox"]',
      '[type="submit"]',
    ];

    const seen = new Set<Element>();
    const lines: string[] = [];

    for (const sel of controlSelectors) {
      let elements: NodeListOf<Element>;
      try { elements = root.querySelectorAll(sel); } catch { continue; }

      for (const el of elements) {
        if (seen.has(el)) continue;
        if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;
        seen.add(el);

        const tagName = el.tagName.toLowerCase();
        const skipTags = ['script', 'style', 'noscript', 'svg', 'path'];
        if (skipTags.includes(tagName)) continue;

        const line = this.formatElementLine(el, tagName);
        if (line) lines.push(line);
      }
    }

    const allLinks = root.querySelectorAll('a[href]');
    const meaningfulLinks: { el: Element; text: string; href: string }[] = [];
    const minorLinks: { el: Element; text: string; href: string }[] = [];

    for (const el of allLinks) {
      if (seen.has(el)) continue;
      if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;

      const href = el.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('javascript:')) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      seen.add(el);

      const text = (el as HTMLElement).innerText?.trim() || '';
      if (!text || text.length < 2) continue;

      const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
      const hasHeading = el.querySelector('h1, h2, h3, h4');
      const isSearchResult = !!el.closest('[data-snc], [data-sokoban-container], .g, .hlcw0c, .MjjYud, [data-header-feature]');
      const isMainContent = !!el.closest('main, [role="main"], #center_col, #rso, #search, article, .content, [role="article"]');

      if (isSearchResult || hasHeading || isExternal || isMainContent || text.length > 20) {
        meaningfulLinks.push({ el, text, href });
      } else {
        minorLinks.push({ el, text, href });
      }
    }

    const MAX_MEANINGFUL_LINKS = 30;
    for (const { el, text, href } of meaningfulLinks.slice(0, MAX_MEANINGFUL_LINKS)) {
      const selector = this.generateSelector(el);
      const displayText = text.length > 80 ? text.substring(0, 80) + '...' : text;
      const displayHref = href.length > 100 ? href.substring(0, 100) + '...' : href;
      lines.push(`<a href="${displayHref}">${displayText}</a>  [selector: ${selector}]`);
    }

    const MAX_MINOR_LINKS = 10;
    for (const { el, text, href } of minorLinks.slice(0, MAX_MINOR_LINKS)) {
      const selector = this.generateSelector(el);
      const displayText = text.length > 60 ? text.substring(0, 60) + '...' : text;
      const displayHref = href.length > 80 ? href.substring(0, 80) + '...' : href;
      lines.push(`<a href="${displayHref}">${displayText}</a>  [selector: ${selector}]`);
    }

    try {
      const onclickEls = root.querySelectorAll('[onclick]');
      let onclickCount = 0;
      for (const el of onclickEls) {
        if (onclickCount >= 10) break;
        if (seen.has(el)) continue;
        if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;

        const tagName = el.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'svg', 'path', 'div', 'span'].includes(tagName)) continue;

        seen.add(el);
        const line = this.formatElementLine(el, tagName);
        if (line) { lines.push(line); onclickCount++; }
      }
    } catch {}

    return lines.length > 0
      ? lines.join('\n')
      : '(no interactive elements found)';
  }

  static formatElementLine(el: Element, tagName: string): string {
    const attrs = this.getElementAttrs(el);
    const text = this.getDirectText(el);
    const selector = this.generateSelector(el);
    const parentCtx = this.getParentContext(el);

    let line = `<${tagName}${attrs}>${text}</${tagName}>`;
    line += `  [selector: ${selector}]`;
    if (parentCtx) line += `  [inside: ${parentCtx}]`;
    return line;
  }

  static getElementAttrs(el: Element): string {
    const parts: string[] = [];
    const attrNames = ['id', 'class', 'name', 'type', 'placeholder', 'value', 'href',
      'role', 'aria-label', 'title', 'alt', 'for', 'action', 'method', 'data-testid'];

    for (const name of attrNames) {
      const val = el.getAttribute(name);
      if (!val) continue;
      let safe = this.safeStringValue(val);

      if (name === 'class') {
        safe = safe.split(/\s+/).filter(c => c.length > 0 && c.length < 30).slice(0, 3).join(' ');
        if (!safe) continue;
      } else if (name === 'href') {
        safe = safe.length > 150 ? safe.substring(0, 150) + '...' : safe;
      } else {
        safe = safe.length > 50 ? safe.substring(0, 50) + '...' : safe;
      }
      parts.push(`${name}="${safe}"`);
    }

    const elTagName = el.tagName.toLowerCase();
    if (elTagName === 'input' || elTagName === 'button' || elTagName === 'select' || elTagName === 'textarea') {
      if ((el as any).disabled) parts.push('disabled');
      if ((el as HTMLInputElement).readOnly) parts.push('readonly');
    }

    return parts.length > 0 ? ' ' + parts.join(' ') : '';
  }

  static getDirectText(el: Element): string {
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim())
      .filter(t => t && t.length > 0)
      .join(' ');
    if (directText) return directText.length > 50 ? directText.substring(0, 50) + '...' : directText;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      const inner = (el as HTMLElement).innerText?.trim() || '';
      return inner.length > 50 ? inner.substring(0, 50) + '...' : inner;
    }
    return '';
  }

  static getParentContext(el: Element): string {
    const parent = el.parentElement;
    if (!parent || parent === document.body) return '';
    const tag = parent.tagName.toLowerCase();
    const id = parent.id ? `#${parent.id}` : '';
    const role = parent.getAttribute('role');
    const label = parent.getAttribute('aria-label');
    let ctx = tag + id;
    if (role) ctx += `[role="${role}"]`;
    if (label) ctx += `[aria-label="${label.substring(0, 30)}"]`;
    return ctx;
  }

  private static extractTextContent(root: Element): string {
    const MAX_CONTENT_CHARS = 4000;
    const lines: string[] = [];
    let charCount = 0;

    const contentSelectors = [
      'h1', 'h2', 'h3', 'h4',
      '[role="heading"]',
      'title',
      'p',
      'li',
      'td', 'th',
      'span[title]', 'span[aria-label]',
      '[class*="title"]', '[class*="name"]', '[class*="heading"]',
      '[id*="title"]', '[id*="name"]',
      'figcaption', 'caption', 'label', 'legend',
    ];

    const seen = new Set<Element>();

    for (const sel of contentSelectors) {
      if (charCount >= MAX_CONTENT_CHARS) break;
      let elements: NodeListOf<Element>;
      try { elements = root.querySelectorAll(sel); } catch { continue; }

      for (const el of elements) {
        if (charCount >= MAX_CONTENT_CHARS) break;
        if (seen.has(el)) continue;
        if (el.closest('#kontextly-root') || el.closest('#kontextly-widget-mount')) continue;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        seen.add(el);

        const elTagName = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim();
        if (!text || text.length < 2) continue;

        const truncText = text.length > 120 ? text.substring(0, 120) + '...' : text;
        const selector = this.generateSelector(el);
        const line = `<${elTagName}> ${truncText}  [selector: ${selector}]`;

        lines.push(line);
        charCount += line.length + 1;
      }
    }

    return lines.length > 0
      ? lines.join('\n')
      : '(no significant text content found)';
  }

  private static extractStructure(el: Element, depth: number, maxDepth: number, budget: number): string {
    if (depth > maxDepth || budget <= 0) return '';

    const tagName = el.tagName?.toLowerCase() || '';
    const skipTags = ['script', 'style', 'noscript', 'svg', 'path', 'canvas', 'iframe', 'object', 'embed'];
    if (skipTags.includes(tagName)) return '';

    const elId = this.safeStringValue(el.id);
    if (elId === 'kontextly-root' || elId === 'kontextly-widget-mount') return '';

    const indent = '  '.repeat(Math.min(depth, 3));
    const id = el.id ? ` id="${el.id}"` : '';
    const role = el.getAttribute('role') ? ` role="${el.getAttribute('role')}"` : '';
    const ariaLabel = el.getAttribute('aria-label');
    const labelAttr = ariaLabel ? ` aria-label="${ariaLabel.substring(0, 30)}"` : '';
    const text = this.getDirectText(el);
    const textPart = text ? ` "${text}"` : '';

    if (el.children.length === 0) {
      const line = `${indent}<${tagName}${id}${role}${labelAttr}>${text}</${tagName}>`;
      return line.length <= budget ? line : '';
    }

    const opening = `${indent}<${tagName}${id}${role}${labelAttr}>${textPart}`;
    const closing = `${indent}</${tagName}>`;
    let remaining = budget - opening.length - closing.length - 2;
    if (remaining <= 0) return '';

    const childParts: string[] = [];
    for (const child of el.children) {
      if (remaining <= 0) break;
      const childStr = this.extractStructure(child as Element, depth + 1, maxDepth, remaining);
      if (childStr) {
        childParts.push(childStr);
        remaining -= childStr.length + 1;
      }
    }

    if (childParts.length === 0 && !text && !id && !role) return '';

    return [opening, ...childParts, closing].join('\n');
  }

  static safeStringValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && value.baseVal !== undefined) return String(value.baseVal || '');
    if (typeof value === 'object') return String(value);
    return String(value);
  }

  static extractImages(scopeSelector?: string): Array<{ src: string; alt?: string; selector: string }> {
    let rootElement: Element | Document = document;

    if (scopeSelector) {
      const scopedElement = document.querySelector(scopeSelector);
      if (scopedElement) rootElement = scopedElement;
    }

    const images = (rootElement as any).querySelectorAll('img') as NodeListOf<HTMLImageElement>;
    return Array.from(images).map((img: HTMLImageElement) => ({
      src: img.src,
      alt: img.alt,
      selector: this.generateSelector(img)
    }));
  }

  static async captureImageAsBase64(imgElement: HTMLImageElement): Promise<string | null> {
    try {
      const src = imgElement.src;

      if (src.startsWith('data:')) {
        return src;
      }

      if (src.startsWith('blob:') || imgElement.crossOrigin !== null) {
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(imgElement, 0, 0);
        return canvas.toDataURL('image/png');
      }

      return src;
    } catch {
      return imgElement.src;
    }
  }

  static generateSelector(element: Element): string {
    if (element.id) return `#${element.id}`;

    if (element.tagName === 'A') {
      const href = element.getAttribute('href');
      if (href && href.length > 1 && href.length <= 150 && !href.startsWith('javascript:')) {
        const hrefSelector = `a[href="${href.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
        try {
          if (document.querySelector(hrefSelector) === element) return hrefSelector;
        } catch {}
      }
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      const className = this.safeStringValue(current.className);
      if (className) {
        const classes = className.split(' ').filter(c => c && !c.includes(' '));
        if (classes.length > 0) {
          selector += '.' + classes[0];
        }
      }

      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children)
          .filter(el => current && el.tagName === current.tagName);
        if (siblings.length > 1 && current) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}
