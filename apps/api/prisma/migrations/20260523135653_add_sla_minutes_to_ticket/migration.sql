-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `sla_ack_minutes` INTEGER NULL,
    ADD COLUMN `sla_resolution_minutes` INTEGER NULL;
