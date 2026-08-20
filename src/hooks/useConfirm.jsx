import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ui';

/**
 * confirm({ title, description, confirmLabel, danger }) -> Promise<boolean>.
 * Skips the dialog and resolves true immediately when the user has turned
 * off Settings > "Ask before deleting data" — render the returned
 * `dialog` node once per page so it has somewhere to show up.
 */
export function useConfirm() {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (opts) => {
      if (user && user.confirmBeforeDelete === false) return Promise.resolve(true);
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setState(opts);
      });
    },
    [user]
  );

  const settle = (value) => {
    setState(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      title={state?.title || 'Are you sure?'}
      description={state?.description}
      confirmLabel={state?.confirmLabel}
      danger={state?.danger !== false}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, dialog };
}
