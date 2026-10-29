import type { DbNode, UserProfile } from '@/shared/hidingLag.types';

/**
 * In-memory stand-in for a Postgres primary + read replica.
 * Writes land on the primary right away and reach the replica only after
 * `replicationLagMs`, which is the lag a real async replica has.
 */
export interface ProfileDb {
  node: DbNode;
  getProfile(): Promise<UserProfile>;
  updateProfileName(name: string): Promise<UserProfile>;
}

export interface SimulatedCluster {
  primary: ProfileDb;
  replica: ProfileDb;
}

const INITIAL_PROFILE: UserProfile = {
  id: 'user-1',
  name: 'Ada Lovelace',
  status: 'active',
  updatedAt: new Date(0).toISOString(),
};

export function createSimulatedCluster(options: { replicationLagMs: number }): SimulatedCluster {
  let primaryRow: UserProfile = { ...INITIAL_PROFILE };
  let replicaRow: UserProfile = { ...INITIAL_PROFILE };

  const replicate = (row: UserProfile) => {
    setTimeout(() => {
      // Ignore out-of-order replication of an older write.
      if (row.updatedAt >= replicaRow.updatedAt) {
        replicaRow = row;
      }
    }, options.replicationLagMs).unref?.();
  };

  const primary: ProfileDb = {
    node: 'primary',
    async getProfile() {
      return { ...primaryRow };
    },
    async updateProfileName(name) {
      primaryRow = { ...primaryRow, name, updatedAt: new Date().toISOString() };
      replicate(primaryRow);
      return { ...primaryRow };
    },
  };

  const replica: ProfileDb = {
    node: 'replica',
    async getProfile() {
      return { ...replicaRow };
    },
    async updateProfileName() {
      throw new Error('Replica is read-only');
    },
  };

  return { primary, replica };
}
