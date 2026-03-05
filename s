2026-03-05T22:37:54.673Z info: [fetchOnePage] Facebook responded with status 200
2026-03-05T22:37:54.675Z error: [fetchOnePage] Facebook response has no "data" field. First 1000 chars: {"errors":[{"message":"Rate limit exceeded","severity":"CRITICAL","code":1675004}],"extensions":{"is_final":true}}
2026-03-05T22:37:54.677Z error: [scheduler] Search 0aec958a-a40a-444c-80e9-ff2d4b031df5 failed: Facebook returned an unexpected response (no data field). Session may be expired.
{
  "name": "SearchMarketPlaceError"
}
SearchMarketPlaceError: Facebook returned an unexpected response (no data field). Session may be expired.
    at fetchOnePage (/Users/michaelmedvedev/Coding/marketplace-scrape/src/features/scrape/scrape.service.ts:140:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async executeTick (/Users/michaelmedvedev/Coding/marketplace-scrape/src/features/scheduler/scheduler.service.ts:43:26)
