// src/types/notification.types.ts
export interface Notification {
  id: string;
  userId: string;
  workspace_id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'EMAIL';
  title: string;
  message: string;
  data: Record<string, any>;
  read_at?: Date;
  created_at: Date;
}

export interface CreateNotificationDto {
  userId: string;
  workspace_id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'EMAIL';
  title: string;
  message: string;
  data?: Record<string, any>;
  send_email?: boolean;
}