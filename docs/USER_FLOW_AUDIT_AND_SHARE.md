# User Flow: Audit and Share

## 1. Install and audit
User installs the pack and runs:
- `node cli/nve-manifest.js`
- `node cli/nve-audit.js`
- `node cli/nve-validate.js`

The user immediately gets:
- a structure report,
- missing guardrails,
- suggested next steps,
- a baseline for later comparison.

## 2. Work normally with the agent
When something fails or is prevented:
- an incident is recorded in `.evolution/incidents/`,
- a reusable experience unit may be created,
- repeated or high-value failures may also create a Failure Genome.

## 3. Choose a sharing tier
The default recommendation is `distilled`.
That means the user shares:
- manifest,
- audit,
- safe incidents,
- experience units,
- safe Failure Genomes.

No raw code by default.

## 4. Upload or pool locally
The exported pack can be:
- uploaded to a hosted service,
- or dropped into a local `research-pool/incoming/` area for aggregation tests.

## 5. Get value back
The system can return:
- repeated failure families,
- validated preventive patterns,
- missing guardrails,
- suggested patch packs,
- cross-repo comparisons by stack.
