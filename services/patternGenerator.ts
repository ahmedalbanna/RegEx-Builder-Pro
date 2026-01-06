
import { GeneratorResult, RegExFlags, Annotation } from "../types";

export const generatePatternAlgorithmic = (
  target: string,
  flags: RegExFlags,
  annotations: Annotation[] = [],
  fullText: string = ""
): GeneratorResult => {
  let pattern = "";
  let explanation = "";

  if (flags.searchMode === 'smart' && annotations.length > 0) {
    const sorted = [...annotations].sort((a, b) => a.start - b.start);
    let parts: string[] = [];
    let explanationParts: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const ann = sorted[i];
      const text = fullText.substring(ann.start, ann.end);
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const nextAnn = sorted[i + 1];
      let gap = "";
      if (nextAnn && nextAnn.start > ann.end) {
        gap = "[\\s\\S]*?";
      }

      if (ann.type === 'context') {
        const isPrevMatch = i > 0 && sorted[i - 1].type === 'match' && sorted[i - 1].end === ann.start;
        const isNextMatch = nextAnn && nextAnn.type === 'match' && nextAnn.start === ann.end;

        if (isNextMatch) {
          parts.push(`(?<=${escaped})`);
          explanationParts.push(`Preceded by "${text}"`);
        } else if (isPrevMatch) {
          parts.push(`(?=${escaped})`);
          explanationParts.push(`Followed by "${text}"`);
        } else {
          parts.push(`(?:${escaped})`);
          explanationParts.push(`Boundary "${text}"`);
        }
      } else {
        parts.push(`(${escaped})`);
        explanationParts.push(`Capture "${text}"`);
        if (gap) {
          parts.push(gap);
          explanationParts.push(`followed by anything`);
        }
      }
    }

    pattern = parts.join("");
    explanation = explanationParts.join(", ") + ". (Tip: Use the eraser brush to fix any selection mistakes in the sandbox above).";
  } else if (flags.searchMode === 'gap') {
    const escA = flags.wordA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escB = flags.wordB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = `(${escA})[\\s\\S]*?(${escB})`;
    explanation = `Matches "${flags.wordA}" and then "${flags.wordB}" with any text between them.`;
  } else if (flags.searchMode === 'between') {
    const escapedStart = flags.startWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEnd = flags.endWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = `${escapedStart}([\\s\\S]*?)${escapedEnd}`;
    explanation = `Captures everything between "${flags.startWord}" and "${flags.endWord}".`;
  } else {
    pattern = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (flags.wholeWord && target) {
      pattern = `\\b${pattern}\\b`;
    }
    explanation = `Exactly matches the text "${target}"${flags.wholeWord ? ' as a whole word only' : ''}.`;
  }

  const flagStr = (flags.global ? 'g' : '') + 
                  (flags.ignoreCase ? 'i' : '') + 
                  (flags.multiline ? 'm' : '');

  return {
    pattern,
    explanation,
    codeSnippets: {
      javascript: `// JavaScript Example\nconst sourceText = \`${fullText.replace(/`/g, '\\`').slice(0, 100)}...\`;\nconst regex = new RegExp('${pattern.replace(/'/g, "\\'")}', '${flagStr}');\nconst matches = [...sourceText.matchAll(regex)];\nconsole.log(matches.map(m => m[0]));`,
      python: `import re\n# Python Example\npattern = r'${pattern}'\nflags = ${flags.ignoreCase ? 're.IGNORECASE | ' : ''}re.UNICODE\nsource_text = """${fullText.slice(0, 100)}..."""\nmatches = re.findall(pattern, source_text, flags=flags)`,
      php: `<?php\n// PHP Example\n$pattern = '/${pattern}/${flagStr}';\n$source_text = "${fullText.slice(0, 100).replace(/"/g, '\\"')}...";\npreg_match_all($pattern, $source_text, $matches);\nprint_r($matches[0]);`
    }
  };
};
