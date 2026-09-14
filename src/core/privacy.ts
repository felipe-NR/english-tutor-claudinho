const KNOWN_SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{16,}\b/u,
  /\bglpat-[A-Za-z0-9_-]{16,}\b/u,
  /\b(?:sk|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{16,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/u,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
  /\b(?:Basic|Bearer)\s+[A-Za-z0-9._~+/=-]{8,}\b/iu,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:]+:[^\s/@]+@/iu,
  /\b(?:api[-_ ]?key|access[-_ ]?token|auth(?:orization)?|client[-_ ]?secret|password|passwd|pwd|secret)\b\s*(?:=|:|\bis\b)\s*(?:"[^"\s]{4,}"|'[^'\s]{4,}'|[^\s,;]{4,})/iu,
];

const CODE_PATTERNS = [
  /```|~~~/u,
  /`[^`]+`/u,
  /[{}]|=>|===|!==|&&|\|\||::|\?\.|\?\?/u,
  /(?:^|\s)(?:const|let|var)\s+[$_\p{L}][$_\p{L}\p{N}]*\s*(?:[=:;])/u,
  /\b(?:function|class|interface|enum)\s+[$_\p{L}][$_\p{L}\p{N}]*\s*(?:[({<:=]|\bextends\b|\bimplements\b)/u,
  /\b(?:import|export)\s+(?:[{*]|\w+\s+from\b)/u,
  /\b[$_A-Za-z][$_A-Za-z0-9]*\s*\([^\n)]*\)\s*;?/u,
  /"[^"\n]+"\s*:/u,
  /<\/?[A-Za-z][^>]*>/u,
  /(?:^|\s)(?:~|\.{1,2})?\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+/u,
  /\b[A-Za-z]:\\[^\s]+/u,
  /https?:\/\/\S+/iu,
  /^\s*(?:[$>#]\s*)?(?:npm|npx|pnpm|yarn|git|curl|wget|sudo|docker|kubectl)\s+\S/iu,
  /^\s*(?:\d{4}-\d{2}-\d{2}[T\s]|(?:ERROR|WARN|INFO|DEBUG|TRACE)\b|[A-Za-z]*Error:\s|Traceback\b)/u,
  /\bat\s+\S+\s+\([^\n)]+:\d+:\d+\)/u,
];

const PROMPT_WRAPPER =
  /(?:^|\s)(?:system|assistant|developer|user)\s*:\s|<\/?(?:system|assistant|developer|user|instructions?|environment_context)>|^\s*#{1,6}\s+(?:task|instructions?|prompt|request)\b/iu;
const DEVELOPER_REQUEST =
  /^\s*(?:please\s+)?(?:analy[sz]e|build|commit|create|debug|delete|deploy|edit|fix|implement|inspect|open|push|read|refactor|review|run|test|update|write)\b/iu;
const TOKEN_CANDIDATE = /[A-Za-z0-9_+/=-]{32,}/gu;
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu;
const SENTENCE_END = /[!?](?=\s|$)|\.(?=\s+\p{Lu}|$)/gu;
const MAX_FRAGMENT_WORDS = 24;

// This is a final storage guard. The protocol keeps these values short and
// prose-only, but hook and MCP inputs remain untrusted at this boundary.
export function isSafeStoredText(value: string): boolean {
  return (
    !value.includes("\n") &&
    !value.includes("\r") &&
    !looksLikeSecret(value) &&
    !CODE_PATTERNS.some((pattern) => pattern.test(value)) &&
    !looksLikeWholePrompt(value)
  );
}

// Occurrence and client identifiers are metadata rather than prose. Keep their
// alphabet narrow and still reject recognizable credential formats.
export function isSafeStoredIdentifier(value: string): boolean {
  return /^[A-Za-z0-9._:-]+$/u.test(value) && !looksLikeSecret(value);
}

function looksLikeSecret(value: string): boolean {
  if (KNOWN_SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }

  const candidates = value.match(TOKEN_CANDIDATE) ?? [];
  return candidates.some((candidate) => {
    const hasLower = /[a-z]/u.test(candidate);
    const hasUpper = /[A-Z]/u.test(candidate);
    const hasDigit = /\d/u.test(candidate);
    const hasTokenPunctuation = /[_+/=-]/u.test(candidate);
    const isLongHex = /^[A-Fa-f0-9]{32,}$/u.test(candidate);
    return isLongHex || (hasLower && hasUpper && hasDigit) || (hasTokenPunctuation && hasDigit && (hasLower || hasUpper));
  });
}

function looksLikeWholePrompt(value: string): boolean {
  if (PROMPT_WRAPPER.test(value)) {
    return true;
  }

  const words = value.match(WORD) ?? [];
  if (words.length > MAX_FRAGMENT_WORDS) {
    return true;
  }

  const sentenceEnds = value.match(SENTENCE_END) ?? [];
  if (sentenceEnds.length > 1) {
    return true;
  }

  return value.length >= 48 && DEVELOPER_REQUEST.test(value);
}
