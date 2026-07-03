import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, UserCheck } from 'lucide-react';
import { personBApi } from '../../../api/personB.api';
import { userService } from '../../auth/services/userService';
import { ROUTES } from '../../../shared/constants/routes';

const REFETCH_INTERVAL_MS = 30_000;

function normalizeUserList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export function useCoordinatorTodos(enabled) {
  const { data: latePendingCount = 0 } = useQuery({
    queryKey: ['navLatePendingCount'],
    queryFn: async () => (await personBApi.getLateSubmissions()).length,
    enabled,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const { data: pendingUsersCount = 0 } = useQuery({
    queryKey: ['coordinatorPendingUsers'],
    queryFn: async () => {
      const data = await userService.getUsers({ status: 'PENDING' });
      return normalizeUserList(data).length;
    },
    enabled,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const items = useMemo(
    () => [
      {
        key: 'late-submissions',
        label: 'Duyệt nộp muộn',
        count: latePendingCount,
        route: ROUTES.COORDINATOR_LATE_SUBMISSIONS,
        icon: ClipboardCheck,
      },
      {
        key: 'user-approval',
        label: 'Duyệt tài khoản',
        count: pendingUsersCount,
        route: ROUTES.USER_APPROVAL,
        icon: UserCheck,
      },
    ],
    [latePendingCount, pendingUsersCount],
  );

  const total = latePendingCount + pendingUsersCount;

  return { items, total };
}
