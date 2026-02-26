"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationSettings,
  updateNotificationSettings,
  testNotification,
} from "@/lib/api";
import type { NotificationSettings } from "@/lib/types";

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["notificationSettings"],
    queryFn: getNotificationSettings,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: NotificationSettings) =>
      updateNotificationSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(["notificationSettings"], data);
    },
  });
}

export function useTestNotification() {
  return useMutation({
    mutationFn: testNotification,
  });
}
