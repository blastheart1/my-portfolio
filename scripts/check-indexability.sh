#!/usr/bin/env bash
#
# Indexability and crawler-access diagnostics.
#
# Every check here was written after being caught out by something: a header
# that silently blocks indexing, an edge rule that 403s AI crawlers, a second
# origin serving the same site. They are cheap and they fail silently in
# production, so they are worth re-running after any domain, Vercel or
# Cloudflare change rather than rediscovering months later.
#
#   ./scripts/check-indexability.sh [origin]

set -uo pipefail
ORIGIN="${1:-https://codebyluis.dev}"
FAIL=0

say()  { printf "  %-46s %s\n" "$1" "$2"; }
bad()  { say "$1" "FAIL — $2"; FAIL=1; }

echo "Indexability check: $ORIGIN"
echo

# 1. Headers that block indexing without appearing in the HTML. Vercel injects
#    X-Robots-Tag: noindex on preview deployments, so its absence also confirms
#    the domain is bound to Production rather than aliased to a preview.
HEAD=$(curl -sI --max-time 15 "$ORIGIN/")
if grep -qi 'x-robots-tag.*noindex' <<<"$HEAD"; then
  bad "X-Robots-Tag" "noindex present — likely a preview alias, not Production"
else
  say "X-Robots-Tag" "absent (domain is Production-bound)"
fi

# 2. Deployment Protection returns 401 to every crawler.
CODE=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 15 "$ORIGIN/")
[ "$CODE" = "200" ] && say "Homepage" "200" || bad "Homepage" "$CODE"

# 3. meta robots in the served HTML.
HTML=$(curl -sL --max-time 20 "$ORIGIN/")
if grep -qiE '<meta name="robots"[^>]*noindex' <<<"$HTML"; then
  bad "meta robots" "noindex in the HTML"
else
  say "meta robots" "indexable"
fi

# 4. The files crawlers look for first.
for path in robots.txt sitemap.xml llms.txt llms-full.txt; do
  C=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 10 "$ORIGIN/$path")
  [ "$C" = "200" ] && say "/$path" "200" || bad "/$path" "$C"
done

# 5. robots.txt must point at the sitemap, or submission is the only discovery
#    path there is.
curl -sL --max-time 10 "$ORIGIN/robots.txt" | grep -qi '^sitemap:' \
  && say "robots.txt Sitemap directive" "present" \
  || bad "robots.txt Sitemap directive" "missing"

# 6. Duplicate origin. www and apex both answering 200 with no redirect means
#    the same site sits at two URLs and the signals split.
WWW_HOST="www.${ORIGIN#https://}"
WWW=$(curl -sI -o /dev/null -w '%{http_code}' --max-time 10 "https://$WWW_HOST/" 2>/dev/null)
if [ "$WWW" = "200" ]; then
  bad "www vs apex" "both 200 with no redirect — add a 308"
else
  say "www vs apex" "$WWW (redirects or unused)"
fi

echo
echo "  AI + search crawler access — every line must be 200."
echo "  A 403 here means the edge is the bottleneck and no on-page work helps."

for UA in \
  "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)" \
  "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)" \
  "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)" \
  "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" \
  "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" \
  "Mozilla/5.0 (compatible; Applebot/0.1)" \
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
do
  NAME=$(grep -oE '(GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|PerplexityBot|Applebot|Googlebot|bingbot)' <<<"$UA" | head -1)
  C=$(curl -sL -A "$UA" -o /dev/null -w '%{http_code}' --max-time 15 "$ORIGIN/")
  [ "$C" = "200" ] && say "$NAME" "200" || bad "$NAME" "$C"
done

# 7. AI crawlers do not execute JavaScript. Whatever is not in this HTML does
#    not exist to them, so the word count is the real ceiling on citability.
#
#    This is the check that would have caught the blog: every post lived inside
#    a client component that fetched on mount and opened a modal, so the
#    crawlable count for that content was zero for as long as it existed. The
#    blog paths are listed here now so it cannot silently go back to zero.
#
#    /blog resolves the newest post's URL from the sitemap when the blog is
#    advertised; before that it is expected to be absent, and the index alone
#    is checked.
echo
NEWEST_POST=$(curl -sL --max-time 20 "$ORIGIN/sitemap.xml" \
  | grep -o "$ORIGIN/blog/[^<]*" | head -1 | sed "s|$ORIGIN/||")

for path in "" "work/automation" "work/relay" "blog" ${NEWEST_POST:+"$NEWEST_POST"}; do
  WORDS=$(curl -sL --max-time 20 "$ORIGIN/$path" \
    | perl -0777 -pe 's/<script.*?<\/script>//gs; s/<[^>]+>/ /g' \
    | tr -s '[:space:]' ' ' | wc -w | tr -d ' ')
  say "crawlable words /${path}" "$WORDS"
done

if [ -z "$NEWEST_POST" ]; then
  say "blog posts in sitemap" "none (expected while BLOG_INDEXABLE is false)"
fi

echo
[ "$FAIL" = "0" ] && echo "  All checks passed." || echo "  Some checks FAILED — see above."
exit "$FAIL"
