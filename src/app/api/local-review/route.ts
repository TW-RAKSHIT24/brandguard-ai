import { NextResponse } from "next/server";

type GuidelineInput = { name: string; text: string };
type Finding = {
  title: string;
  severity: "High" | "Medium" | "Low";
  confidence: number;
  explanation: string;
  evidence: string;
  source: string;
  originalText: string;
  suggestion: string;
};

const MAX_CONTENT_LENGTH = 12_000;
const MAX_GUIDELINE_LENGTH = 12_000;
const MAX_SOURCES = 10;

function sentences(text: string): string[] {
  return (text.match(/[^.!?\n]+[.!?]?/g) ?? []).map((sentence) => sentence.trim()).filter(Boolean);
}

function quoteTerm(value: string): string {
  return value.trim().replace(/^["'“‘]+|["'”’]+$/g, "").trim();
}

function scan(content: string, guidelines: GuidelineInput[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  const addFinding = (finding: Finding) => {
    const key = `${finding.title}:${finding.source}:${finding.originalText.toLowerCase()}`;
    if (seen.has(key) || !content.includes(finding.originalText)) return;
    seen.add(key);
    findings.push(finding);
  };

  for (const guideline of guidelines) {
    const rules = sentences(guideline.text);
    for (const rule of rules) {
      const terminology = rule.match(
        /\buse\s+["“]?([^"”]+?)["”]?\s+(?:instead of|rather than)\s+["“]?([^"”]+?)["”]?(?:[.!?]|$)/i,
      );
      if (terminology) {
        const preferred = quoteTerm(terminology[1]);
        const discouraged = quoteTerm(terminology[2]);
        const match = content.match(new RegExp(`\\b${escapeRegExp(discouraged)}\\b`, "i"));
        if (match) {
          addFinding({
            title: "Use approved terminology",
            severity: "Medium",
            confidence: 90,
            explanation: `The draft uses “${match[0]}”, while the guideline prefers “${preferred}”.`,
            evidence: rule,
            source: guideline.name,
            originalText: match[0],
            suggestion: preferred,
          });
        }
      }

      const disallowed = rule.match(/\b(?:do not use|don't use|never use|avoid)\s+["“]([^"”]+)["”]/i);
      if (disallowed) {
        const term = quoteTerm(disallowed[1]);
        const match = content.match(new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"));
        if (match) {
          addFinding({
            title: "Avoid disallowed terminology",
            severity: "High",
            confidence: 90,
            explanation: `The draft contains “${match[0]}”, which this guideline explicitly disallows.`,
            evidence: rule,
            source: guideline.name,
            originalText: match[0],
            suggestion: "a suitable alternative",
          });
        }
      }

      if (/\b(?:avoid|do not|don't|never|no)\b.*\b(?:guarantee|absolute|superlative|unsupported claim|promise)\b/i.test(rule)) {
        const absoluteClaims =
          /\b(?:guaranteed to|guaranteed|guarantee|the only|only|always|never|best|#1|number one|world['’]s best)\b/gi;
        for (const match of content.matchAll(absoluteClaims)) {
          const originalText = match[0];
          const suggestion = originalText.toLowerCase().startsWith("guaranteed to")
            ? "designed to help"
            : /^the only$/i.test(originalText)
              ? "a"
              : /^(?:guaranteed|guarantee)$/i.test(originalText)
                ? "aim to"
                : /^(?:best|#1|number one|world['’]s best)$/i.test(originalText)
                  ? "reliable"
                  : "often";
          addFinding({
            title: "Absolute or guaranteed claim",
            severity: "High",
            confidence: 78,
            explanation: "This phrase reads as an absolute or guarantee, which the cited brand rule says to avoid.",
            evidence: rule,
            source: guideline.name,
            originalText,
            suggestion,
          });
        }
      }

      if (/\b(?:avoid|do not|don't|never|no)\b.*\b(?:quantif|unsupported|unsubstantiated|unverified|specific claim)\w*/i.test(rule)) {
        const quantified =
          /\bby\s+\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?percent\b|\b\d+(?:\.\d+)?\s?(?:x|times)\b|\b(?:double|triple|quadruple)\s+(?:your\s+)?(?:productivity|revenue|sales|growth|results|performance)(?:\s+\w+){0,2}/gi;
        for (const match of content.matchAll(quantified)) {
          const originalText = match[0];
          const suggestion = /^(?:double|triple|quadruple)/i.test(originalText)
            ? "support your productivity"
            : /^by\s/i.test(originalText)
              ? "when backed by data"
              : "a verified amount";
          addFinding({
            title: "Unsubstantiated quantified claim",
            severity: "Medium",
            confidence: 72,
            explanation: "The draft includes a quantified outcome without supporting evidence in the provided content.",
            evidence: rule,
            source: guideline.name,
            originalText,
            suggestion,
          });
        }
      }
    }
  }
  return findings.slice(0, 30);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!title || title.length > 100) {
      return NextResponse.json({ error: "Add a review name of 1–100 characters." }, { status: 422 });
    }
    if (content.length < 10 || content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content must be between 10 and ${MAX_CONTENT_LENGTH.toLocaleString()} characters.` },
        { status: 422 },
      );
    }
    if (!Array.isArray(input.guidelines) || input.guidelines.length === 0) {
      return NextResponse.json(
        { error: "Add at least one brand guideline before running a local rules scan." },
        { status: 422 },
      );
    }
    if (input.guidelines.length > MAX_SOURCES) {
      return NextResponse.json({ error: `Use at most ${MAX_SOURCES} brand sources per review.` }, { status: 422 });
    }

    const guidelines: GuidelineInput[] = [];
    for (const item of input.guidelines) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Each brand source must include a name and text." }, { status: 422 });
      }
      const source = item as Record<string, unknown>;
      if (
        typeof source.name !== "string" ||
        !source.name.trim() ||
        source.name.length > 200 ||
        typeof source.text !== "string" ||
        !source.text.trim() ||
        source.text.length > MAX_GUIDELINE_LENGTH
      ) {
        return NextResponse.json({ error: "A brand source is empty, too large, or has invalid details." }, { status: 422 });
      }
      guidelines.push({ name: source.name.trim(), text: source.text });
    }

    return NextResponse.json({ findings: scan(content, guidelines), reviewMode: "local-rules" });
  } catch (error) {
    console.error("Local BrandGuard review failed", error);
    const message = error instanceof Error ? error.message : "The local rules scan failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
