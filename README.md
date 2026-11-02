# @trileo/contracts

Neutral, versioned wire schemas for Trileo services. This package is build-time infrastructure and is not deployed as a service.

Edit only `schemas/v1/` and `subjects/v1.json`, then run `npm run generate`. Files under `generated/` are deterministic output.

Use the public package entry point from consumers. Do not deep-import generated internals or manually copy DTOs between services.

## Organization foundation

Organization-scoped operations use `OrganizationServiceRequest`, which adds a required
`organizationId` beside the trusted actor and correlation ID. The organization ID selects the
requested scope; it is not proof of membership. Main and Project must re-authorize each operation.

The envelope may also carry an optional `organizationRole` (`org_admin` | `member`). It is a
trusted membership fact with exactly one legitimate setter: the Gateway, which copies it from
Main's `organizations.get.v1` reply for that `organizationId` on every request. Main ignores any
`organizationRole` it receives and reads the role from its own membership table. Project relies on
it and treats its absence as deny. The AI service and every other publisher must never set it.
NATS has no publisher credentials yet, so this rule is enforced by review and a static check, not
by the transport. Organization context lives on this envelope; `ActorContext` is unchanged.
The existing `ServiceRequest` and owner-scoped `projects.*.v1` subjects remain unchanged.

The new `projects.*.v2` subjects use the existing project command/query payloads inside
`OrganizationServiceRequest` and return `OrganizationProjectResponse` (or
`OrganizationProjectsPageResponse` for list). The response includes the organization and the
actor's effective project role. Collaborator operations also use the organization envelope.

Organization create/list/get-personal, invitation list-mine and invitation acceptance use
`ServiceRequest`; Main resolves the scope from the authenticated user or invitation. Other
organization, membership and invitation operations use `OrganizationServiceRequest`. Responses
use the existing `ServiceResponse` wrapper. Removal/revocation operations return an empty data object.
Invitation acceptance must verify the actor's verified email matches the invitation; knowing
an invitation ID grants no authority. Requested member/collaborator roles in a payload are policy
inputs, never trusted actor roles; the only trusted organization role is the Gateway-set envelope
`organizationRole` described above.

## Project uploads (read side)

`uploads.get.v1` (`GetUploadQuery` → `UploadResponse`) and `uploads.list.v1`
(`ListUploadsQuery` → `UploadsPageResponse`) use `OrganizationServiceRequest`. **No service
serves or calls them until W4**, which also defines `uploads.create.v1` and the byte-transfer and
completion subjects once the transport is chosen. Lists are ordered by `createdAt` descending,
then `id` descending; without a `status` filter every status is listed.

- `UploadResponse` never carries the storage driver or storage key (`additionalProperties: false`).
  Where bytes are stored is internal to Project.
- `organizationId`, `uploadedByUserId`, `status`, `statusReasonCode` and `readyAt` are
  server-decided. Clients never supply them.
- `MediaType` is a format, not an enum: the allowed list is `UPLOAD_ALLOWED_TYPES` config.
- `statusReasonCode` is a format, not an enum, so new codes need no contract change. A `pending`
  upload has neither `readyAt` nor a reason code; `ready` has `readyAt` and no reason code;
  `rejected` and `failed` have a reason code and no `readyAt`. Initial codes:

| Status | Code | Meaning |
|---|---|---|
| `rejected` | `TYPE_NOT_ALLOWED` | The sniffed type is not in `UPLOAD_ALLOWED_TYPES` |
| `rejected` | `TYPE_MISMATCH` | The sniffed type differs from the declared `mediaType` |
| `rejected` | `SIZE_LIMIT_EXCEEDED` | Over `UPLOAD_MAX_FILE_BYTES` |
| `rejected` | `SIZE_MISMATCH`, `HASH_MISMATCH` | The received bytes differ from the declaration |
| `failed` | `STORAGE_ERROR` | The storage driver failed |
| `failed` | `UPLOAD_EXPIRED` | The stale-upload reaper ended a `pending` upload |

Run `uv sync --frozen --extra dev` once, then `npm run check:generated`, `npm run verify`
and `npm run build`. CI runs those checks with Node 24 and Python 3.14. npm dependencies
remain pinned by the tracked package-lock.json.

