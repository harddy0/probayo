export const QUEUE_NAMES = {
  FILES: 'files',
  MAIL: 'mail',
  NOTIFICATIONS: 'notifications',
} as const;

export const JOB_NAMES = {
  PROCESS_FILE: 'process-file',
  UPLOAD_TICKET_ATTACHMENT: 'upload-ticket-attachment',
  UPLOAD_COMMENT_ATTACHMENT: 'upload-comment-attachment',
  SEND_ESCALATION_EMAIL: 'send-escalation-email',
  SEND_BREACH_NOTIFICATION_EMAIL: 'send-breach-notification-email',
  SEND_TICKET_CREATED_NOTIFICATION: 'send-ticket-created-notification',
  SEND_TICKET_ASSIGNED_NOTIFICATION: 'send-ticket-assigned-notification',
} as const;

export const RETRY_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY: 5000, // 5 seconds base, exponential
  BACKOFF_TYPE: 'exponential' as const,
};
