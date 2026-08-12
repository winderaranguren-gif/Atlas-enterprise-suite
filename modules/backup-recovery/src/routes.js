import { backupRoutes as legacyBackupRoutes } from '../../backups/routes.js';

/**
 * ATLAS Backup/Recovery modular runtime boundary.
 *
 * The API Gateway depends only on this module. The proven snapshot, integrity
 * verification, Organization/DBA scoping, R2 object protection and empty-only
 * restore implementation remains behind this compatibility adapter during the
 * Modular v2 migration.
 */
export async function backupRecoveryRoutes(request, env, url = new URL(request.url)) {
  return legacyBackupRoutes(request, env, url);
}

export const BACKUP_RECOVERY_RUNTIME_CONTRACT = Object.freeze({
  owner: 'backup-recovery',
  compatibilityAdapter: true,
  storage: Object.freeze(['D1', 'R2']),
  scope: Object.freeze(['organization_id', 'dba_id']),
  restorePolicy: 'empty_only',
  routes: Object.freeze([
    'GET /api/backups',
    'POST /api/backups',
    'POST /api/backups/:id/verify',
    'POST /api/backups/:id/restore'
  ])
});
