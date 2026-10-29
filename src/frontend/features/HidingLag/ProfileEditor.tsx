import { useState } from 'react';
import classNames from 'classnames';
import type { UserProfile } from '@/shared/hidingLag.types';
import { useProfile } from './useProfile';
import styles from './Profile.module.scss';

export const ProfileEditor = ({ readYourOwnWrites }: { readYourOwnWrites: boolean }) => {
  const { query, mutation } = useProfile({ readYourOwnWrites });

  if (query.isPending) return <div className={styles.loading}>Loading...</div>;
  if (query.isError) return <div className={styles.error}>{query.error.message}</div>;

  const { profile, servedBy } = query.data;

  return (
    <div className={classNames(styles.container, styles.editorLayout)}>
      <h2 className={styles.header}>Edit Profile</h2>

      <dl className={styles.facts}>
        <dt>Shown name</dt>
        <dd data-testid="shown-name">{profile.name}</dd>
        <dt>Last read from</dt>
        <dd>
          <span className={classNames(styles.badge, styles[servedBy])}>{servedBy}</span>
          {query.isFetching && <span className={styles.muted}> refetching…</span>}
        </dd>
      </dl>

      {/* Keyed by the saved name so the draft resets when the server value changes. */}
      <NameForm
        key={profile.name}
        profile={profile}
        isSaving={mutation.isPending}
        onSave={(name) => mutation.mutate(name)}
      />

      {mutation.isError && <p className={styles.error}>Save failed: {mutation.error.message}</p>}

      <button type="button" className={styles.secondaryBtn} onClick={() => query.refetch()}>
        Refetch now
      </button>
    </div>
  );
};

function NameForm({
  profile,
  isSaving,
  onSave,
}: {
  profile: UserProfile;
  isSaving: boolean;
  onSave: (name: string) => void;
}) {
  const [draftName, setDraftName] = useState(profile.name);
  const trimmed = draftName.trim();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSave(trimmed);
      }}
    >
      <input
        className={styles.inputField}
        aria-label="Name"
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
      />
      <button
        type="submit"
        className={styles.saveBtn}
        disabled={isSaving || !trimmed || trimmed === profile.name}
      >
        Save
      </button>
    </form>
  );
}
