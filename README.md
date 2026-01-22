# ALS Static Oracle

## Overview
The **Static Oracle** is a lightweight, configuration-driven Account Lookup Service (ALS) oracle implementation designed for resolving party lookups to Digital Financial Service Providers (DFSPs) without relying on a database.

It primarily supports **Sub-ID based routing**, specifically for use cases where the Payer DFSP explicitly specifies the Payee DFSP. This is common in environments where infrastructure or specific scheme rules require the sender to select the destination provider (e.g., selecting a bank from a list).

This approach provides elegant solutions for several common challenges:

1.  **Solves the "Duplicate Wallet" Problem**: By routing based on the combination of ID and Target Provider (Sub-ID), it allows a single identifier (like an MSISDN) to be associated with multiple wallets across different providers.
2.  **Supports Inherent Routing Info**: It seamlessly handles traditional identifiers where routing logic can be derived directly from the ID itself (e.g., account numbers containing bank codes or specific mobile prefixes).
3.  **Lowers Barriers to Adoption**: It eliminates the need for a complex central registry or user "opt-in" process. Users are reachable immediately as long as the sender can select the correct provider, simplifying integration for DFSPs.

In this flow:
1.  The Payer provides the **Payee ID** and a **Sub-ID** (representing the target DFSP code, e.g., `UG-ORG001`).
2.  The Oracle maps this `subId` to the corresponding network-level `FSP_ID`.
3.  The ALS routes the transaction to the resolved DFSP.

While designed for this explicit selection model, the Oracle is generic enough to also support:
*   **Full match based routing** (e.g., exact MSISDN)
*   **Prefix-based routing**

The oracle evaluates incoming party lookup requests against a set of **static rules** defined via configuration and returns the corresponding DFSP ID.

This service is ideal when:
*   DFSP routing logic is known in advance.
*   Routing is based on Sub-ID, prefix, or exact identifier match.
*   Dynamic registration (POST /participants) is not required.
*   Operational simplicity is preferred over maximum flexibility.

## Key Characteristics
*   **Stateless**: No database dependency.
*   **Config-driven**: All routing logic defined in configuration (rules).
*   **Deterministic**: First matching rule wins.
*   **Deployable independently**: Not a hard dependency of Mojaloop core Helm charts.
*   **Environment-specific**: Different rule sets per environment.

## How it Works

Instead of querying a dynamic database, the Static Oracle uses a high-performance **Routing Engine** to compile a "Decision Table" (JSON configuration) into optimized lookup structures (maps, tries, regex arrays) at startup.

For deep technical details on the matching algorithm, performance, and rule configuration, please refer to the [Routing Engine Documentation](./ROUTING_ENGINE.md).

### Configuration & Deployment

The service is typically deployed as an environment-specific add-on rather than a core dependency.

1.  **Rule Definition**: Rules are defined in a configuration file (typically via Helm values or a `default.json` in local development).
2.  **Deployment**: The service is enabled in the environment pipeline (e.g., set `mlSubIdMappingOracleEnabled: true`).
3.  **Mapping Config**: The actual mappings are provided in the values file.

**Example Configuration (Conceptual):**
```yaml
subIdMap:
  ACCOUNT_ID: &dfspCodeMap
    "dfsp_a_code": "DFSP_A"
    "dfsp_b_code": "DFSP_B"
  MSISDN: *dfspCodeMap
```

### Enabling in an Environment
To enable the Static Oracle:
1.  **Deploy**: Enable the add-on in the environment pipeline configuration.
2.  **Configure**: Provide the DFSP mappings in the values file (`mlSubIdMappingOracle.yaml`).
3.  **Update ALS**: Ensure the Account Lookup Service (ALS) is configured to route lookup requests to this Static Oracle endpoint.

## Setup & Development

### Clone repo
```bash
git clone git@github.com:mojaloop/als-static-oracle-svc.git
```

### Improve local DNS resolver
Add the `127.0.0.1   als-static-oracle-svc.local` entry in your `/etc/hosts` so the _als-static-oracle-svc_ is reachable on `http://als-static-oracle-svc.local:3000`. Elsewhere use `http://localhost:3000`

### Install service dependencies
```bash
cd als-static-oracle-svc
npm ci
```

### Run local dockerized _als-static-oracle-svc_
```bash
npm run docker:build
npm run docker:run
```

To check the als-static-oracle-svc health visit [http://als-static-oracle-svc.local:3000/health](http://als-static-oracle-svc.local:3000/health)


### Run locally

```bash
docker-compose up -d mysql
npm run migrate
npm run start
```


### Updating the OpenAPI (Swagger) Spec

We use `multi-file-swagger` to make our swagger files more manageable.

After making changes to the `.yaml` files in `./src/interface/`, update the `swagger.json` file like so:

```bash
    npm run build:openapi
```

> **Note:** We will likely want to move to swagger 3.0 at some point, and once we do, we will be able to use the [common api snippets](https://github.com/mojaloop/api-snippets) library to factor out common Mojaloop snippets.
> Keep track of [#352 - Update to OpenAPI v3](https://app.zenhub.com/workspaces/pisp-5e8457b05580fb04a7fd4878/issues/mojaloop/mojaloop/352)

## Auditing Dependencies

We use `audit-ci` along with `npm audit` to check dependencies for node vulnerabilities, and keep track of resolved dependencies with an `audit-ci.jsonc` file.

To start a new resolution process, run:

```bash
npm run audit:fix
```

You can then check to see if the CI will pass based on the current dependencies with:

```bash
npm run audit:check
```

The [audit-ci.jsonc](./audit-ci.jsonc) contains any audit-exceptions that cannot be fixed to ensure that CircleCI will build correctly.

