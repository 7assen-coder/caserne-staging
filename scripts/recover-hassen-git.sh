#!/bin/bash
# Recovery Hassen : sortir du rebase, restaurer la branche, merge origin, push.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Nettoyage des locks Git..."
find .git -name '*.lock' -delete 2>/dev/null || true

if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  echo "==> Rebase encore actif — abandon..."
  git rebase --quit 2>/dev/null || git rebase --abort 2>/dev/null || true
fi

echo "==> Retour sur la branche Hassen (commit local avec tous les modules)..."
git switch -f Hassen

echo "==> État actuel :"
git status -sb
git log --oneline -3

echo "==> Merge avec origin/Hassen (sans toucher les autres branches)..."
git fetch origin Hassen
git pull origin Hassen --no-rebase

echo ""
echo "Si des conflits apparaissent (surtout fichiers élèves) :"
echo "  1. Résolvez-les dans Cursor"
echo "  2. git add ."
echo "  3. git commit -m 'merge: sync Hassen with origin'"
echo "  4. git push origin Hassen"
echo ""
echo "Backup composants : ~/Desktop/backup-esp-components-* et /tmp/esp-git-backup/"
