export const QUEUE_NAMES = {
  FILES: 'files',
} as const;

export const JOB_NAMES = {
  PROCESS_FILE: 'process-file',
  UPLOAD_TICKET_ATTACHMENT: 'upload-ticket-attachment',
  UPLOAD_COMMENT_ATTACHMENT: 'upload-comment-attachment',
} as const;

export const RETRY_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY: 5000, // 5 seconds base, exponential
  BACKOFF_TYPE: 'exponential' as const,
};
