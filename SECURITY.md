# Security Policy

## Supported versions

Security fixes are currently provided for:

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Reporting a vulnerability

Please do **not** open public issues for security problems.

Report vulnerabilities privately to: **security@example.com**

If email is not available, use a private maintainer contact channel.

## What to include

Please include:

- a clear description of the issue
- affected component / file / feature
- reproduction steps or proof of concept
- impact assessment
- any suggested mitigation, if known

## Response expectations

We will try to:

- acknowledge receipt within **3 business days**
- provide an initial assessment within **7 business days**
- share status updates as work progresses

## Disclosure policy

Please allow time for investigation and remediation before public disclosure.
Once a fix is available, we may publish a summary and credit the reporter if they want.

## Scope

In scope:

- vulnerabilities in source code in this repository
- insecure defaults that create real exploit risk
- authentication, authorization, data exposure, injection, RCE, dependency-risk with real impact

Out of scope unless a concrete exploit is shown:

- best-practice suggestions without demonstrable risk
- missing headers on non-deployed local dev surfaces
- theoretical issues without a reproducible path
- denial-of-service findings that require unrealistic resources
