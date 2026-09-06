// ============================================================================
// Hermes CLI bridge — runs the local `hermes` agent as the live operator.
// ----------------------------------------------------------------------------
// CashFromChaos talks to a real Hermes agent in single-shot mode:
//     hermes -z "<prompt>"   →  Hermes' final text response on stdout.
//
// This is "Mode B" from CLAUDE.md (app ↔ local Hermes process). It is only
// reached when OPERATOR_BRAIN=hermes (or llm). The default fixture path never
// imports this file, so the offline demo stays network-free.
//
// Reliability contract for the video: every call has a timeout and any failure
// (CLI missing, timeout, non-zero exit, empty output) throws — the HermesBrain
// catches it and falls back to the deterministic fixture output. Hermes can
// make the demo smarter; it can never make it break.
// ============================================================================

import { execFile } from "node:child_process";

const HERMES_TIMEOUT_MS = Number(process.env.HERMES_TIMEOUT_MS ?? 60_000);

/**
 * Validates and returns the binary command or path for Hermes.
 * Restricts binary name to safe characters and prevents option injection / path traversal.
 */
export function getValidatedHermesBin(overrideBin?: string): string {
  const bin = overrideBin ?? process.env.HERMES_BIN ?? "hackathon";
  if (!bin || typeof bin !== "string" || bin.trim() === "") {
    throw new Error("HERMES_BIN must be a non-empty string");
  }
  if (bin.includes("\0")) {
    throw new Error("Invalid HERMES_BIN: contains null byte");
  }
  if (bin.includes("..")) {
    throw new Error(`Invalid HERMES_BIN: path traversal ("..") is not allowed: ${bin}`);
  }
  if (bin.startsWith("-")) {
    throw new Error(`Invalid HERMES_BIN: binary name cannot start with a hyphen: ${bin}`);
  }
  const SAFE_BIN_REGEX = /^[a-zA-Z0-9_.\-/]+$/;
  if (!SAFE_BIN_REGEX.test(bin)) {
    throw new Error(`Invalid HERMES_BIN: contains unsafe characters: ${bin}`);
  }
  return bin;
}

/**
 * Run a single self-contained prompt through the Hermes CLI and return its
 * final text response. Throws on any failure so callers can fall back.
 */
export function runHermes(prompt: string): Promise<string> {
  const hermesBin = getValidatedHermesBin();
  const args = ["-z", prompt];
  // Optional model override; otherwise Hermes uses its configured default
  // (e.g. the user's OAuth provider), which is the most reliable path.
  const model = process.env.HERMES_MODEL;
  if (model) args.push("-m", model);

  return new Promise((resolve, reject) => {
    execFile(
      hermesBin,
      args,
      { timeout: HERMES_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, encoding: "utf8" },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`hermes CLI failed: ${err.message} ${stderr ?? ""}`.trim()));
          return;
        }
        const out = (stdout ?? "").trim();
        if (!out) {
          reject(new Error("hermes CLI produced no output"));
          return;
        }
        resolve(out);
      }
    );
  });
}

/**
 * Run a prompt that must return JSON, and parse it. Tolerates models that wrap
 * the object in prose or \`\`\`json fences by extracting the first balanced {...}.
 */
export async function runHermesJson<T>(prompt: string): Promise<T> {
  const raw = await runHermes(
    prompt +
      "\n\nRespond with ONLY a single JSON object. No prose, no markdown fences, no tool use."
  );
  const obj = extractJson(raw);
  if (obj === undefined) {
    throw new Error(`hermes did not return parseable JSON: ${raw.slice(0, 200)}`);
  }
  return obj as T;
}

/** Pull the first balanced JSON object out of a possibly-noisy string. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  if (start === -1) return undefined;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}
