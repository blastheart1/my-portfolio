import { readFileSync } from 'node:fs';

/**
 * Reads a source file with its comments removed.
 *
 * Several guard rails in this repo work by scanning source text for a pattern
 * that must not appear: `force-dynamic`, `dynamicParams = false`,
 * `'use client'`, a deprecated model name. Those same files tend to explain,
 * in a comment, exactly which anti-pattern they are avoiding and why — which
 * is the most useful thing in them.
 *
 * Scanning the raw text makes those two things contradict each other: the file
 * fails the rule for documenting the rule. A guard rail that punishes writing
 * down the reasoning trains people to delete the reasoning.
 *
 * So these assertions read code. Naming a pattern in prose is free; using it
 * is what fails.
 *
 * Not exhaustive — it does not track strings or regex literals containing
 * comment markers — but it does not need to be. It is a test helper reading
 * this repo's own files, and the `[^:]` guard before `//` keeps it from
 * eating the rest of a line after a `https://` URL.
 */
export function readCode(filePath: string): string {
  return readFileSync(filePath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
