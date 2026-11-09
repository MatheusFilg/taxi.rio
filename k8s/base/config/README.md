Symlinks para ficheiros canónicos no repo (evita duplicar `infra/` e `observability/`).

O `kubectl kustomize` usa `--load-restrictor=LoadRestrictionsNone` no script `k8s/scripts/kind-deploy.sh` para permitir referências fora de `k8s/base`.
