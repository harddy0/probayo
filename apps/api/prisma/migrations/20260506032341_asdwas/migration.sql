-- CreateTable
CREATE TABLE `failed_jobs` (
    `id` CHAR(36) NOT NULL,
    `queue` VARCHAR(255) NOT NULL,
    `payload` JSON NOT NULL,
    `exception` TEXT NOT NULL,
    `failed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `resolved_at` DATETIME(0) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
