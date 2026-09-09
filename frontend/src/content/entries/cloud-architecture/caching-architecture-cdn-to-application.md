---
title: 'Caching architecture: from CDN to application layer'
description: >-
  Every layer between a client and a database is a place to cache — the real
  design problem is invalidation and the stampede that follows a popular
  key expiring, not where to put the cache.
kicker: Guide · cloud architecture
lead: >-
  There's an old line about cache invalidation being one of the two genuinely
  hard problems in computer science, and it holds up because caching itself
  is easy: store a copy of something expensive to compute closer to where
  it's needed. Every layer of a real system has a cache sitting somewhere in
  it. The design problem worth actual attention is what happens when the
  cached value stops being true, not where to put the cache.
wide: true
tileMeta: 'Invalidation, stampedes, and picking the right pattern at each layer'
---
## 1\. The layers a request actually passes through

A request from a client to a database passes through several places that could each hold a cached answer, and the earlier in that path a cache hit occurs, the cheaper the request was to serve. A CDN, geographically distributed and sitting closest to the client, can serve a cached response without the request ever reaching the origin infrastructure at all. A reverse proxy or edge cache in front of the application can serve a cached response without the application's own code running. An application-level cache, an in-memory store or a dedicated cache service like Redis, can serve a value without the database being queried. The database's own internal buffer cache is the last layer, keeping recently accessed pages in memory so even a cache miss at every layer above it doesn't necessarily mean a disk read.

Each layer trades a lower hit rate for a broader class of content it can safely cache, or the reverse: a CDN caches whole responses well, but only for content that's genuinely the same for every requester (or cacheable per a small number of variants); an application-level cache can hold something specific to one user's session, at the cost of every request past the CDN layer still reaching the application to check it.

## 2\. CDN caching: keys and TTLs

A CDN decides whether it can serve a cached response using a cache key, typically the request URL plus whichever headers the origin has told it matter (a `Vary` header, most commonly), and a time-to-live that governs how long a cached response is served before the CDN considers it stale and re-fetches from origin. Getting the cache key wrong in either direction causes a specific, opposite failure: a key that's too broad serves one user's personalized or region-specific content to a different user who happened to request the same URL; a key that's too narrow (varying on a header that doesn't actually change the response) fragments what should have been one shared cache entry into many, tanking the hit rate for no real benefit.

TTL is a direct tradeoff between freshness and origin load: a short TTL keeps content close to current at the cost of hitting the origin more often; a long TTL protects the origin at the cost of clients potentially seeing stale content for longer after it changes. The mitigation that avoids picking one fixed value for content with genuinely different volatility is setting TTL per content type rather than globally, a long TTL for a versioned static asset whose filename changes whenever its content does, a short one for anything that changes on its own schedule without a corresponding URL change.

## 3\. Application-level caching patterns

Cache-aside (also called lazy loading) has the application check the cache first, and on a miss, read from the database, then write the result into the cache before returning it, so the next request for the same key hits the cache. This is the simplest pattern to reason about and the most common default, and its main property worth naming is that the cache and the database can genuinely disagree for a window after a write, until the cache entry either expires or is explicitly invalidated.

Write-through has the application write to the cache and the database together, as part of the same write path, so the cache is never behind what was just written, at the cost of every write now paying the latency of both operations rather than just the database write. Write-behind (or write-back) writes to the cache immediately and persists to the database asynchronously afterward, which is fast for the caller but introduces a real durability risk: a crash between the cache write and the deferred database write loses data that the caller was already told succeeded, which makes write-behind a pattern to reach for only when that specific risk is genuinely acceptable for the data in question, not a default.

## 4\. Invalidation: the actual hard problem

A TTL-based expiry is invalidation by default: the entry goes stale on its own schedule regardless of whether the underlying data actually changed, which is simple and safe but means every cached value is wrong for some window after a real update, up to the full length of the TTL. Explicit invalidation, deleting or updating the cache entry at the moment the underlying data changes, closes that staleness window, at the cost of the invalidation logic now being one more thing that has to run correctly, every time, on every code path that writes the underlying data, including paths a future change might add without remembering the cache exists at all.

The failure that actually shows up in production isn't usually "we forgot to invalidate," it's an invalidation path that only covers the common write path and misses a secondary one, a bulk import, an admin tool, a background job, that updates the same underlying data through a different code path nobody updated to also touch the cache. The mitigation that scales better than remembering every write path is deriving invalidation from something the write already has to do regardless, a database change-data-capture stream, or a version or timestamp stamped on the cached value that's checked against the source on read, rather than trusting that every present and future writer of the underlying data will remember to also touch the cache explicitly.

## 5\. Cache stampede

A cache stampede happens when a single, heavily requested key expires, and a burst of concurrent requests all miss the cache at nearly the same instant, and all of them, independently, go to recompute or re-fetch the same expensive value from the origin at once, because none of them can see that another request is already doing the same work. For a genuinely hot key (a popular product page, a frequently read configuration value), this can turn a single, ordinary cache expiry into a sudden multiplied spike of load on the origin, at exactly the moment the cache was supposed to be protecting it.

The standard mitigations both work by ensuring only one request actually pays the recomputation cost while the rest either wait or serve something slightly stale. A locking approach has the first request to miss acquire a lock, recompute the value, and populate the cache, while concurrent requests either wait briefly for that lock to release or fall back to serving the stale value if a stale-while-revalidate policy is in place. Probabilistic early expiration recomputes a hot key's value slightly before its TTL actually expires, with the probability of doing so on any given request increasing as the entry approaches expiry, so a hot key gets refreshed by one early request well before the hard deadline that would otherwise cause every concurrent request to miss at once.

## 6\. Consistency risk: stale reads and their real cost

Every cache that isn't write-through carries a real risk that a read sees a value that's no longer true, and the question worth asking explicitly, not left implicit, is how expensive a stale read actually is for this specific piece of data. A stale product description for a few seconds after an edit is a non-event. A stale account balance, or a stale permission check that still shows access that was just revoked, is a real correctness and security problem, not a minor freshness nuisance. The right caching pattern, and the right TTL, is a decision that should follow from that cost, not from a single caching policy applied uniformly across every kind of data a system holds regardless of how expensive being wrong about it actually is.

## 7\. Worked example: a stampede-safe cache-aside implementation

A product catalog page is served from a cache-aside layer in front of the database, with a five-minute TTL per product. Under normal traffic this works fine; during a promotional spike, one particular product's cache entry expires at a moment when thousands of concurrent requests are hitting that same product page, and all of them miss the cache within the same few milliseconds, sending a burst of thousands of identical database queries at once, briefly degrading the database for every other product's traffic too.

The fix adds a short-lived lock keyed to that specific product ID: the first request to miss the cache acquires the lock and proceeds to query the database and repopulate the cache; every other concurrent request for the same key, seeing the lock already held, either waits a short bounded interval for the cache to be repopulated and then reads the fresh value, or, if a slightly stale previous value is still available and staleness is acceptable for this data, serves that stale value immediately rather than waiting at all. Either branch results in exactly one database query for the expired key instead of thousands, and the choice between waiting and serving stale is precisely the freshness-cost question Section 6 describes, made explicit for this one piece of data instead of left as an accident of how the cache happened to expire.

This pairs with [cloud cost optimization](/cloud-architecture/cloud-cost-optimization) for how much of a workload's actual origin load, and therefore its cost, a well-designed cache layer removes, and with [database architecture in the cloud](/cloud-architecture/database-architecture-cloud) for the read-replica lag problem that's the same underlying staleness tradeoff, one layer further down the stack.
