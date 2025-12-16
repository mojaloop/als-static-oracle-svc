# Routing Engine Documentation

## Overview

This service uses a **high-performance routing engine** instead of a traditional database for participant resolution. The routing engine compiles decision tables from JSON configuration into optimized lookup structures (maps, prefix tries, and regex arrays) at startup.

## Architecture

```
Decision Table (JSON)
   ↓ compile at startup
Optimized Lookup Maps/Tries
   ↓ runtime lookup (O(1) to O(k))
DFSP Resolution
```

### Key Components

1. **RoutingEngine** - Compiles and executes routing rules
2. **RoutingBasedOracleDB** - Implements IOracleDb interface using the routing engine
3. **Config** - JSON decision table loaded from `config/default.json`

## Decision Table Format

### Example Configuration

```json
{
  "rules": [
    {
      "ruleId": "R001",
      "priority": 1,
      "description": "Exact match for specific MSISDN",
      "match": {
        "type": "MSISDN",
        "id": { "mode": "EXACT", "value": "123456789" }
      },
      "result": { "dfspId": "dfsp2" }
    },
    {
      "ruleId": "R010",
      "priority": 10,
      "description": "Prefix match for India (91)",
      "match": {
        "type": "MSISDN",
        "id": { "mode": "PREFIX", "value": "91" }
      },
      "result": { "dfspId": "dfspindia" }
    },
    {
      "ruleId": "R999",
      "priority": 9999,
      "description": "Default fallback",
      "match": {
        "type": "MSISDN",
        "id": { "mode": "ANY" }
      },
      "result": { "dfspId": "dfsp_default" }
    }
  ]
}
```

## Matching Modes

| Mode | Description | Performance | Use Case |
|------|-------------|-------------|----------|
| `EXACT` | Full string match | O(1) | Specific phone numbers |
| `PREFIX` | Starts with pattern | O(k) where k = ID length | Country codes, area codes |
| `REGEX` | Regular expression | O(n) where n = pattern complexity | Complex patterns |
| `ANY` | Always matches (fallback) | O(1) | Default route |

## Priority Rules

- **Lower number = Higher priority**
- Rules are evaluated in priority order
- First matching rule wins
- Recommend priority ranges:
  - 1-99: Exact matches
  - 100-999: Prefix matches
  - 1000-8999: Regex patterns
  - 9000+: Fallback/default rules

## SubId Support

Rules can optionally match on `subId`:

```json
{
  "ruleId": "R030",
  "priority": 5,
  "match": {
    "type": "MSISDN",
    "id": { "mode": "PREFIX", "value": "91" },
    "subId": { "mode": "EXACT", "value": "merchant" }
  },
  "result": { "dfspId": "dfsp_merchant_india" }
}
```

## Runtime Lookup Strategy

The routing engine optimizes lookups based on match mode:

1. **EXACT match** → Hash map lookup (O(1))
2. **PREFIX match** → Prefix trie traversal (O(k))
3. **REGEX match** → Sequential regex test (O(n×m))
4. **DEFAULT** → Fallback value (O(1))

### Lookup Order (per request)

```
1. Check in-memory store (for POST-created entries)
2. EXACT match in compiled map
3. PREFIX match in trie (longest match wins)
4. REGEX match (first match wins)
5. DEFAULT fallback
6. Return null (not found)
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Startup compilation | O(n) | n = number of rules |
| Exact lookup | O(1) | Hash map lookup |
| Prefix lookup | O(k) | k = ID length |
| Regex lookup | O(m) | m = number of regex rules |
| Memory usage | O(n×k) | Depends on prefix diversity |


## Adding New Routes

### Step 1: Edit `config/default.json`

```json
{
  "rules": [
    {
      "ruleId": "R020",
      "priority": 20,
      "description": "UAE prefix",
      "match": {
        "type": "MSISDN",
        "id": { "mode": "PREFIX", "value": "971" }
      },
      "result": { "dfspId": "dfsp_uae" }
    }
  ]
}
```

### Step 2: Restart the service

The routing engine compiles rules at startup. Changes to `default.json` require a service restart.

### Optional: Hot Reload

To implement hot reload, add a file watcher that:
1. Detects changes to `default.json`
2. Recompiles the routing engine
3. Swaps the compiled structure atomically

## Validation & Conflict Detection

### Automatic Checks at Startup

- ✅ Rules are sorted by priority
- ✅ Invalid regex patterns are logged and skipped
- ✅ Duplicate exact matches (same priority) use first-wins

### Recommended Pre-Deployment Checks

1. **Priority conflicts**: Ensure no duplicate priorities for overlapping rules
2. **Regex validity**: Test all regex patterns
3. **Coverage**: Verify at least one fallback rule exists
4. **Performance**: Limit regex rules (prefer EXACT/PREFIX)

## Operational Considerations

### Logging

The routing engine logs:
- Compilation time and rule counts at startup
- Match type and result for each lookup (at debug level)
- Invalid regex patterns (at warn level)

### Monitoring

Expose metrics for:
- Compilation time
- Lookup latency (by match type)
- Rule count by type
- Cache hit rates (if caching is added)

### Testing

Use the in-memory store for dynamic testing:
- POST to create test entries
- GET to verify routing
- DELETE to clean up

Static routes from the decision table are read-only and cannot be deleted via DELETE API.

## Future Enhancements

### Planned Features

1. **Time-based rules** - Validity windows (`from`/`to` timestamps)
2. **Hot reload** - Watch `default.json` and recompile on change
3. **Redis caching** - Cache final resolutions for high-traffic IDs
4. **Conflict detection** - Validate rules at load time
5. **Rule versioning** - Track decision table versions
6. **Metrics** - Export routing statistics

### Extending Match Modes

To add new match modes, update:
1. `MatchMode` type in `RoutingEngine.ts`
2. `compileRule()` method
3. `lookupInBucket()` method
4. Config schema in `convictFileConfig.ts`

## Examples

### High-Priority Exact Match

```json
{
  "ruleId": "VIP001",
  "priority": 1,
  "match": {
    "type": "MSISDN",
    "id": { "mode": "EXACT", "value": "919999999999" }
  },
  "result": { "dfspId": "dfsp_vip" }
}
```

### Multi-Country Prefix Rules

```json
[
  {
    "ruleId": "IN",
    "priority": 100,
    "match": {
      "type": "MSISDN",
      "id": { "mode": "PREFIX", "value": "91" }
    },
    "result": { "dfspId": "dfsp_india" }
  },
  {
    "ruleId": "UAE",
    "priority": 101,
    "match": {
      "type": "MSISDN",
      "id": { "mode": "PREFIX", "value": "971" }
    },
    "result": { "dfspId": "dfsp_uae" }
  }
]
```

### Regex Pattern (Use Sparingly)

```json
{
  "ruleId": "TEST",
  "priority": 5000,
  "match": {
    "type": "MSISDN",
    "id": { "mode": "REGEX", "value": "^999[0-9]{7}$" }
  },
  "result": { "dfspId": "dfsp_test" }
}
```

## Troubleshooting

### Route Not Matching

1. Check priority order (lower = higher priority)
2. Verify exact match comes before prefix match
3. Check regex syntax
4. Ensure fallback rule exists

### Slow Lookups

1. Too many regex rules → convert to PREFIX or EXACT
2. Deep prefix trees → optimize prefix patterns
3. Missing indexes → ensure EXACT rules use maps

### Memory Usage

1. Limit total rule count (recommend < 10,000)
2. Optimize prefix diversity (share common prefixes)
3. Avoid extremely long prefix patterns

## Contact

For questions or issues, see the main [README](./README.md) or file an issue on GitHub.
