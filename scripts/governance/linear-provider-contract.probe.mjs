/** SPE-3432 — trusted-host, manually triggered *read-only* Linear schema evidence.
 * Requires an externally provisioned restricted LINEAR_API_KEY.
 * Never prints the key, executes mutations, or enables write classes.
 */
import { probeLinearMutationContract, mutationWriteCapability } from './linear-provider-contract.mjs'

const result = await probeLinearMutationContract({ token: process.env.LINEAR_API_KEY })
const observed = result.observed ?? null
const report = Object.freeze({
  issue: 'SPE-3432',
  transport: 'trusted-host-read-only-introspection',
  schemaObserved: observed !== null,
  issueUpdatePresent: observed?.issueUpdatePresent ?? false,
  issueUpdateArguments: observed?.issueUpdateArguments ?? [],
  issueUpdateInputFields: observed?.issueUpdateInputFields ?? [],
  revisionGuarantee: 'unverified',
  enabledWriteClasses: [],
  writeEnabled: mutationWriteCapability().enabled,
  outcome: result.outcome,
  reason: result.reason,
})
console.log(JSON.stringify(report, null, 2))
if (observed === null) process.exitCode = 1
