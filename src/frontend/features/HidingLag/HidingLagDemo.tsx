import { useState } from 'react';
import { ProfileEditor } from './ProfileEditor';
import styles from './Profile.module.scss';

export const HidingLagDemo = () => {
  const [readYourOwnWrites, setReadYourOwnWrites] = useState(true);

  return (
    <div className={styles.demo}>
      <section className={styles.explainer}>
        <h2>Hiding replication lag</h2>
        <p>
          The server has a primary database and a read replica that gets each write
          about 3 seconds late. Writes go to the primary. Reads go to the replica unless
          the client sends <code>x-force-primary: true</code>.
        </p>
        <ol>
          <li>The optimistic update shows the new name right away.</li>
          <li>After saving, the refetch asks for the primary, so it can&apos;t return stale data.</li>
        </ol>
        <p>
          Turn read-your-own-writes off and save a new name: the refetch hits the replica
          and the old name comes back. Press &ldquo;Refetch now&rdquo; after ~3s to see it catch up.
        </p>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={readYourOwnWrites}
            onChange={(e) => setReadYourOwnWrites(e.target.checked)}
          />
          Read-your-own-writes protection
        </label>
      </section>

      <ProfileEditor readYourOwnWrites={readYourOwnWrites} />
    </div>
  );
};
