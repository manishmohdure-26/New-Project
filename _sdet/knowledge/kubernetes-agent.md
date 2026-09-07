# Helmsman — Kubernetes Agent Knowledge

> Training file for Helmsman (Senior Kubernetes Test Infrastructure Specialist).
> Edit this file to customize Helmsman's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Manifest Generation Rules (CRITICAL)
- **Every container spec gets resource requests AND limits** — a Job with no limits in a
  shared cluster is a noisy-neighbor incident waiting to happen
- **Every pod spec gets a securityContext** — `runAsNonRoot: true`, capabilities dropped,
  `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true` (writable-fs
  exceptions scoped to an explicit emptyDir mount)
- **Every ephemeral namespace/Job gets a TTL or teardown mechanism** — no infrastructure
  generated without a stated expiry path (`ttlSecondsAfterFinished`,
  `activeDeadlineSeconds`, or a cleanup CronJob)
- **Probe paths/ports are confirmed, never assumed** — check `outputs/docker-agent/` or
  the Dockerfile `HEALTHCHECK`/`EXPOSE` before writing a probe path into a manifest
- **Never invent cluster contexts, namespace prefixes, registries, or ingress domains** —
  pull from `project-context.md` or ask the user
- **Secret VALUES never appear in output files** — only key names or `secretKeyRef` refs

## Learnings

<!-- Add learnings from past Kubernetes test-infrastructure runs -->

## Test-Runner Job/CronJob Manifest Pattern

A one-off CI-triggered test run uses a `Job`; a scheduled regression/soak run uses a
`CronJob` wrapping the same pod template.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: test-runner-<suite>-<run-id>
  namespace: <namespace-prefix>-test
  labels:
    app.kubernetes.io/component: test-runner
    test-suite: <suite>
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 1800          # hard cap — Job is killed if it runs past this
  ttlSecondsAfterFinished: 3600        # auto-deleted 1h after completion (success or fail)
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: test-runner-sa
      containers:
        - name: test-runner
          image: <registry>/<image>:<tag>   # from outputs/docker-agent/
          command: ["npm", "test"]
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits: { cpu: "1", memory: "512Mi" }
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - name: test-results
              mountPath: /app/test-results
      volumes:
        - name: test-results
          emptyDir: {}
```

For a scheduled run, wrap the identical `spec.template` under
`spec.jobTemplate.spec.template` inside a `CronJob`, add `schedule: "0 3 * * *"`, and set
`concurrencyPolicy: Forbid` so overlapping soak/regression runs never stack.

## Ephemeral-Namespace-per-PR Strategy

1. **Naming:** `pr-<pr-number>-<service>` (or the project's convention from
   `project-context.md`) — deterministic, greppable, and collision-free across concurrent
   PRs.
2. **Provisioning trigger:** CI pipeline step on `pull_request: [opened, synchronize]`
   runs `kubectl create namespace pr-<n>-<service>` (or a Helm install targeting that
   namespace) and applies a `ResourceQuota` + `LimitRange` so the preview cannot starve
   the shared cluster.
3. **Isolation:** label the namespace (`preview=true`, `pr=<n>`) so network policies and
   cost-tracking can scope to it; never let a preview namespace reach production secrets
   or data stores.
4. **TTL / teardown — pick one, always state which:** a CI hook on `pull_request: closed`
   running `kubectl delete namespace pr-<n>-<service>` (fastest, tied to PR lifecycle); a
   scheduled cleanup CronJob deleting any `preview=true` namespace older than N hours as a
   backstop; or a namespace-TTL controller/annotation (`ttl.k8s.io/expires`) if the
   cluster already runs one.
5. **Cost control:** cap concurrent preview namespaces (e.g. via a quota on the `preview`
   label) so a burst of open PRs cannot exhaust cluster capacity.

A namespace generated without an explicit answer to step 4 is not test-ready — it is a
future cleanup ticket.

## Helm Test Hook Pattern (`helm.sh/hook: test`)

A Helm test hook is a smoke check run **after** `helm install`/`helm upgrade` completes —
it validates the deployed release is reachable and minimally functional. It is NOT a
substitute for the full test suite (that is `automation-agent`'s / `api-test-agent`'s
job); it answers "did this release come up correctly," not "does the feature work."

```yaml
# templates/tests/connection-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ .Release.Name }}-test-connection"
  annotations:
    "helm.sh/hook": test
    "helm.sh/hook-delete-policy": hook-succeeded,before-hook-creation
spec:
  restartPolicy: Never
  containers:
    - name: wget
      image: busybox
      command: ["wget"]
      args: ["{{ .Release.Name }}:{{ .Values.service.port }}/health"]
```

Run with `helm test <release-name> -n <namespace>`. Use
`hook-delete-policy: hook-succeeded,before-hook-creation` so passing test pods clean
themselves up but failed ones stay around for `kubectl logs` debugging until the next
run. State the invocation and delete policy explicitly in every generated hook — never
leave hook-delete-policy unset (it defaults to never deleting, which litters the release
history with stale test pods).

## Probe Verification Checklist (readiness / liveness / startup)

Each probe type answers a different question — verify all three separately, do not
conflate them:

- **Readiness** — "can this pod receive traffic right now?" Failing readiness removes the
  pod from Service endpoints without restarting it. Verify the probe path/port matches a
  real health endpoint (confirmed against `outputs/docker-agent/` or Dockerfile) and
  `initialDelaySeconds`/`periodSeconds` don't hold a legitimately-ready pod out of rotation.
- **Liveness** — "is this pod stuck and needs a restart?" Failing liveness kills and
  restarts the container. Verify the probe does NOT hit an external dependency (DB,
  downstream API) that can fail independently of the app being alive — that causes
  restart storms when a dependency, not the app, is unhealthy.
- **Startup** — "has this pod finished booting?" Required for slow-starting apps so
  liveness doesn't kill a still-initializing pod. Verify `failureThreshold * periodSeconds`
  covers worst-case startup time; K8s auto-suppresses liveness/readiness until
  `startupProbe` succeeds.
- **Cross-check:** every probe's path/port is confirmed to exist in the container (from
  `outputs/docker-agent/`'s exposed port/HEALTHCHECK) before it's written into a manifest
  — a probe pointing at a path the container never serves will never report Ready and
  silently blocks all traffic.
- **Flag, don't assume, a missing probe** — a container manifest with no readiness probe
  in a shared cluster is a finding, not a pass.

## Resource Limits & Security-Context Checklist (test pods)

- [ ] `resources.requests` set for CPU and memory (scheduler needs this to place the pod
      sensibly in a shared test cluster)
- [ ] `resources.limits` set for CPU and memory (prevents one test pod starving
      neighbors; memory limit prevents OOM cascade onto the node)
- [ ] `securityContext.runAsNonRoot: true` (plus `runAsUser` if the image isn't already
      non-root by default)
- [ ] `securityContext.allowPrivilegeEscalation: false`
- [ ] `securityContext.capabilities.drop: ["ALL"]` (add back only what a test genuinely
      needs, never keep the default set)
- [ ] `securityContext.readOnlyRootFilesystem: true`, with any required writable path
      (e.g. `/tmp`, test-result dir) mounted as an explicit `emptyDir`
- [ ] `automountServiceAccountToken: false` unless the test pod genuinely needs the K8s API
- [ ] `ttlSecondsAfterFinished` (Job) or namespace TTL (ephemeral namespace) set — see
      Ephemeral-Namespace-per-PR Strategy above
- [ ] `activeDeadlineSeconds` set on every Job so a hung run cannot occupy cluster capacity
      indefinitely
- [ ] No `latest` image tag on a test workload — pin to the tag from
      `outputs/docker-agent/` so a run is reproducible

A manifest missing any checked item is a QA finding — report it explicitly rather than
silently fixing and moving on, since the omission may reflect a cluster policy gap that
affects other workloads too.
