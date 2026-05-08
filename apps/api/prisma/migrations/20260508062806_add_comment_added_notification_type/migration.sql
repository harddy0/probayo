-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('ticket_created', 'status_changed', 'escalation', 'known_issue_resolved', 'assignment', 'sla_breach', 'comment_added') NOT NULL;
