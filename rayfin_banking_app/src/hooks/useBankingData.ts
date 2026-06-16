import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createBankAccount,
  createMoneyMovement,
  ensureSeededBankingData,
  loadBankingSnapshot,
} from '@/services/bankingData';
import { buildBankingAnalytics } from '@/services/bankingAnalytics';
import type { AuthUser } from '@/services/IAuthService';
import type {
  BankingSnapshot,
  CreateAccountInput,
  CreateMoneyMovementInput,
} from '@/types/banking';

const emptySnapshot: BankingSnapshot = {
  profile: null,
  accounts: [],
  categories: [],
  transactions: [],
};

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected banking error.';
}

export function useBankingData(user: AuthUser | null) {
  const [snapshot, setSnapshot] = useState<BankingSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const nextSnapshot = await loadBankingSnapshot();
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setSnapshot(emptySnapshot);
        setError(null);
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        await ensureSeededBankingData(user);
        const nextSnapshot = await loadBankingSnapshot();

        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(toMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const runMutation = useCallback(
    async (operation: () => Promise<void>) => {
      setMutating(true);
      setError(null);

      try {
        await operation();
        await hydrate(false);
      } catch (mutationError) {
        const message = toMessage(mutationError);
        setError(message);
        throw new Error(message);
      } finally {
        setMutating(false);
      }
    },
    [hydrate]
  );

  const createAccount = useCallback(
    async (input: CreateAccountInput) => {
      if (!user) {
        throw new Error('You must be signed in to create accounts.');
      }

      await runMutation(() => createBankAccount(user, input));
    },
    [runMutation, user]
  );

  const createTransaction = useCallback(
    async (input: CreateMoneyMovementInput) => {
      if (!user) {
        throw new Error('You must be signed in to record transactions.');
      }

      await runMutation(() => createMoneyMovement(user, input));
    },
    [runMutation, user]
  );

  const analytics = useMemo(() => buildBankingAnalytics(snapshot), [snapshot]);

  return {
    ...snapshot,
    analytics,
    loading,
    mutating,
    error,
    refresh: () => hydrate(true),
    createAccount,
    createTransaction,
  };
}
