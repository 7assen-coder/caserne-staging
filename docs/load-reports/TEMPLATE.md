# Load report — officers-100

| Field | Value |
|-------|--------|
| Date | YYYY-MM-DD |
| Operator | |
| BASE_URL | https://polyspace-api.onrender.com |
| Script | `load/k6/officers-100.js` |
| VUs (hold) | 100 |
| Duration | ~8m (2+5+1) |
| http_req_failed | % |
| p95 login | ms |
| p95 eleves_list | ms |
| p95 eleves_detail | ms |
| checks | % |
| **Result** | PASS / FAIL |
| Compared to prod SLO-LOGIN / SLO-LIST | PASS gate only / N/A (see [`docs/ops-slo-capacity.md`](../ops-slo-capacity.md)) |

## Notes

- Staging woken before run: yes / no
- Seed users used: 1 shared / N officers
- Follow-ups:

