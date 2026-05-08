-- AlterTable
ALTER TABLE `ticket_status_history` MODIFY `from_status` ENUM('open', 'acknowledged', 'pending_user', 'in_progress', 'resolved', 'closed') NULL,
    MODIFY `to_status` ENUM('open', 'acknowledged', 'pending_user', 'in_progress', 'resolved', 'closed') NOT NULL;

-- AlterTable
ALTER TABLE `tickets` MODIFY `status` ENUM('open', 'acknowledged', 'pending_user', 'in_progress', 'resolved', 'closed') NOT NULL;
