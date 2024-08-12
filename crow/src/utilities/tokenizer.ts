class Tokenizer {
  private tokenizer: any;
  public getTokeSize(text: string): any {
    if (!text) {
      return 0;
    }

    if (!this.tokenizer) {
      import('js-tiktoken').then((module) => {
        this.tokenizer = module;
        return this.getTokens(module, text);
      });
    } else {
      return this.getTokens(this.tokenizer, text);
    }
  }

  public getTokens(tokenizer: any, text: string): any {
    const { getEncoding, encodingForModel } = tokenizer;
    const enc = getEncoding('cl100k_base');
    const res = enc.encode(text);

    return res.length;
  }

  // 过滤常用词的分词函数
  public getSplitTokens(text: string): Set<string> {
    // prettier-ignore
    const englishStopWords = ["we", "our", "you", "it", "its", "they", "them", "their", "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "can", "don", "t", "s", "will", "would", "should", "what", "which", "who", "when", "where", "why", "how", "a", "an", "the", "and", "or", "not", "no", "but", "because", "as", "until", "again", "further", "then", "once", "here", "there", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "above", "below", "to", "during", "before", "after", "of", "at", "by", "about", "between", "into", "through", "from", "up", "down", "in", "out", "on", "off", "over", "under", "only", "own", "same", "so", "than", "too", "very", "just", "now"];
    // prettier-ignore
    const programmingStopWords = ["if", "then", "else", "for", "while", "with", "def", "function", "return", "TODO", "import", "try", "catch", "raise", "finally", "repeat", "switch", "case", "match", "assert", "continue", "break", "const", "class", "enum", "struct", "static", "new", "super", "this", "var"];

    const allStopWords = new Set([...programmingStopWords, ...englishStopWords]);

    const tokens = text
      .split(/[^a-zA-Z0-9]/)
      .filter((word) => word.length > 0)
      .filter((word) => !allStopWords.has(word));

    return new Set(tokens);
  }
}

const tokenizer = new Tokenizer();

export default tokenizer;
