export const DOMExtractor = {
  extractText(maxLength = 50000) {
    if (!document.body) return '';
    
    // Performance optimization: Walker avoids massive reflows triggering OOM on complex SPAs
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => {
          const tag = node.parentElement?.tagName?.toLowerCase();
          if (['script', 'style', 'noscript', 'meta', 'svg', 'canvas'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
           return NodeFilter.FILTER_ACCEPT;
      }}
    );

    let textChunk = '';
    let node = walker.nextNode();
    
    while (node && textChunk.length < maxLength) {
      const txt = node.nodeValue?.trim();
      if (txt) {
         textChunk += txt + ' ';
      }
      node = walker.nextNode();
    }
    
    return textChunk;
  }
};
