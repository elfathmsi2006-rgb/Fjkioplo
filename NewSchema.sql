CREATE DATABASE  IF NOT EXISTS `spa_el_fath` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `spa_el_fath`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: spa_el_fath
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_trail`
--

DROP TABLE IF EXISTS `audit_trail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_trail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` enum('INSERT','UPDATE','DELETE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created_at` (`created_at`),
  KEY `idx_audit_table_record` (`table_name`,`record_id`),
  KEY `idx_audit_actor` (`actor_id`),
  CONSTRAINT `fk_audit_trail_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_breakdown_reports`
--

DROP TABLE IF EXISTS `cmms_breakdown_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_breakdown_reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int unsigned NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `reported_at` datetime NOT NULL,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `symptom` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `root_cause` text COLLATE utf8mb4_unicode_ci,
  `corrective_action` text COLLATE utf8mb4_unicode_ci,
  `outcome` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `downtime_minutes` int unsigned DEFAULT NULL,
  `reported_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_breakdown_machine_date` (`machine_id`,`reported_at`),
  KEY `idx_cmms_breakdown_task` (`task_id`),
  KEY `fk_cmms_breakdown_user` (`reported_by`),
  CONSTRAINT `fk_cmms_breakdown_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_breakdown_task` FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_breakdown_user` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_condition_readings`
--

DROP TABLE IF EXISTS `cmms_condition_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_condition_readings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int unsigned NOT NULL,
  `metric` enum('TEMPERATURE','VIBRATION','NOISE','ENERGY','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_num` decimal(18,5) NOT NULL,
  `unit` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `measured_at` datetime NOT NULL,
  `source` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `threshold_min` decimal(18,5) DEFAULT NULL,
  `threshold_max` decimal(18,5) DEFAULT NULL,
  `notes` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recorded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_condition_machine_date` (`machine_id`,`measured_at`),
  KEY `idx_cmms_condition_metric` (`metric`,`measured_at`),
  KEY `fk_cmms_condition_user` (`recorded_by`),
  CONSTRAINT `fk_cmms_condition_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_condition_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_machine_meter_readings`
--

DROP TABLE IF EXISTS `cmms_machine_meter_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_machine_meter_readings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int unsigned NOT NULL,
  `meter_type` enum('OPERATING_HOURS','CYCLES','PRODUCTION_UNITS') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reading_value` decimal(18,3) NOT NULL,
  `reading_at` datetime NOT NULL,
  `source` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recorded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_meter_machine_type_date` (`machine_id`,`meter_type`,`reading_at`),
  KEY `fk_cmms_meter_user` (`recorded_by`),
  CONSTRAINT `fk_cmms_meter_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_meter_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_maintenance_manual_links`
--

DROP TABLE IF EXISTS `cmms_maintenance_manual_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_maintenance_manual_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` enum('MANUAL','PROCEDURE','DRAWING','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL',
  `revision` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_manual_machine` (`machine_id`,`active`),
  KEY `fk_cmms_manual_link_user` (`created_by`),
  CONSTRAINT `fk_cmms_manual_link_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_manual_link_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_pm_checklist_items`
--

DROP TABLE IF EXISTS `cmms_pm_checklist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_pm_checklist_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT '1',
  `unit` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minimum_value` decimal(14,4) DEFAULT NULL,
  `maximum_value` decimal(14,4) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_pm_checklist_plan` (`plan_id`,`active`,`sort_order`),
  CONSTRAINT `fk_cmms_pm_checklist_plan` FOREIGN KEY (`plan_id`) REFERENCES `cmms_preventive_plans` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_pm_occurrences`
--

DROP TABLE IF EXISTS `cmms_pm_occurrences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_pm_occurrences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint unsigned NOT NULL,
  `due_at` datetime NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `occurrence_status` enum('GENERATED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERATED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cmms_pm_occurrence` (`plan_id`,`due_at`),
  KEY `idx_cmms_pm_occurrence_task` (`task_id`),
  CONSTRAINT `fk_cmms_pm_occurrence_plan` FOREIGN KEY (`plan_id`) REFERENCES `cmms_preventive_plans` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_pm_occurrence_task` FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_preventive_plans`
--

DROP TABLE IF EXISTS `cmms_preventive_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_preventive_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `frequency_days` smallint unsigned NOT NULL,
  `last_completed_at` datetime DEFAULT NULL,
  `next_due_at` datetime NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_preventive_due` (`active`,`next_due_at`),
  KEY `idx_cmms_preventive_machine` (`machine_id`),
  KEY `fk_cmms_preventive_creator` (`created_by`),
  CONSTRAINT `fk_cmms_preventive_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_preventive_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_work_order_checklist_results`
--

DROP TABLE IF EXISTS `cmms_work_order_checklist_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_work_order_checklist_results` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `checklist_item_id` bigint unsigned NOT NULL,
  `result` enum('PASS','FAIL','NA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `measured_value` decimal(14,4) DEFAULT NULL,
  `notes` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `completed_by` bigint unsigned DEFAULT NULL,
  `completed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cmms_task_checklist_result` (`task_id`,`checklist_item_id`),
  KEY `idx_cmms_checklist_task` (`task_id`),
  KEY `fk_cmms_checklist_result_item` (`checklist_item_id`),
  KEY `fk_cmms_checklist_result_user` (`completed_by`),
  CONSTRAINT `fk_cmms_checklist_result_item` FOREIGN KEY (`checklist_item_id`) REFERENCES `cmms_pm_checklist_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_checklist_result_task` FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_checklist_result_user` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cmms_work_order_parts`
--

DROP TABLE IF EXISTS `cmms_work_order_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cmms_work_order_parts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `part_id` bigint unsigned NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit_cost` decimal(14,2) NOT NULL,
  `status` enum('RESERVED','ISSUED','RETURNED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RESERVED',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmms_work_order_parts_task` (`task_id`,`status`),
  KEY `idx_cmms_work_order_parts_part` (`part_id`),
  KEY `fk_cmms_work_order_parts_user` (`created_by`),
  CONSTRAINT `fk_cmms_work_order_parts_part` FOREIGN KEY (`part_id`) REFERENCES `warehouse_parts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_work_order_parts_task` FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cmms_work_order_parts_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gmail_connections`
--

DROP TABLE IF EXISTS `gmail_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gmail_connections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `google_email` varchar(254) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `encrypted_refresh_token` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `granted_scopes` text COLLATE utf8mb4_unicode_ci,
  `connected_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gmail_connections_user` (`user_id`),
  CONSTRAINT `fk_gmail_connections_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gmail_oauth_states`
--

DROP TABLE IF EXISTS `gmail_oauth_states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gmail_oauth_states` (
  `state_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`state_hash`),
  KEY `idx_gmail_oauth_states_expiry` (`expires_at`),
  KEY `idx_gmail_oauth_states_user` (`user_id`),
  CONSTRAINT `fk_gmail_oauth_states_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interventions`
--

DROP TABLE IF EXISTS `interventions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interventions` (
  `Date` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `heure` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ID machine` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Machine (auto)` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Atelier (auto)` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Mod�le (auto)` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `N� de s�rie (auto)` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Panne constat�e` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Cause racine` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Pi�ces chang�es` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technicien` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Dur�e (min)` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Rang jour` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Rang filtre` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `machine_technical_manuals`
--

DROP TABLE IF EXISTS `machine_technical_manuals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_technical_manuals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `machine_id` int unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'application/pdf',
  `size_bytes` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_machine_manual_storage_key` (`storage_key`),
  KEY `idx_machine_manual_machine` (`machine_id`,`created_at`),
  CONSTRAINT `fk_machine_manual_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `machines`
--

DROP TABLE IF EXISTS `machines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workshop_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manufacturer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `production_line_position` int DEFAULT NULL,
  `m_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_year` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `listed_state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intervention_nbr` int DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `notes` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workshop_id` smallint unsigned DEFAULT NULL,
  `production_line_id` bigint unsigned DEFAULT NULL,
  `name_fr` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `install_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `technician_description` text COLLATE utf8mb4_unicode_ci,
  `technician_description_updated_at` datetime DEFAULT NULL,
  `workshop_chief_description` text COLLATE utf8mb4_unicode_ci,
  `workshop_chief_description_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_machines_workshop_id` (`workshop_id`),
  CONSTRAINT `fk_machines_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=209 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maintenance_log_attachments`
--

DROP TABLE IF EXISTS `maintenance_log_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_log_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `maintenance_log_id` bigint unsigned NOT NULL,
  `attachment_type` enum('IMAGE','AUDIO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` bigint unsigned NOT NULL,
  `sha256` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_maintenance_attachment_storage_key` (`storage_key`),
  KEY `idx_maintenance_attachment_log_type` (`maintenance_log_id`,`attachment_type`),
  CONSTRAINT `fk_maintenance_attachment_log` FOREIGN KEY (`maintenance_log_id`) REFERENCES `maintenance_logs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maintenance_logs`
--

DROP TABLE IF EXISTS `maintenance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `technician_id` bigint unsigned DEFAULT NULL,
  `maintenance_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `file_format` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `machine_id` int unsigned DEFAULT NULL,
  `machine_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workshop_id` smallint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `task_id` bigint unsigned DEFAULT NULL,
  `maintenance_type` enum('CORRECTIVE','PREVENTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CORRECTIVE',
  `cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `duration_hours` decimal(8,2) NOT NULL DEFAULT '0.00',
  `problem_description` text COLLATE utf8mb4_unicode_ci,
  `work_performed` text COLLATE utf8mb4_unicode_ci,
  `diagnosis` text COLLATE utf8mb4_unicode_ci,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `downtime_start` datetime DEFAULT NULL,
  `downtime_end` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `submission_status` enum('DRAFT','SUBMITTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUBMITTED',
  `idempotency_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_maintenance_logs_idempotency` (`idempotency_key`),
  KEY `idx_maintenance_technician` (`technician_id`),
  KEY `idx_maintenance_machine` (`machine_id`),
  KEY `idx_maintenance_workshop` (`workshop_id`),
  KEY `idx_maintenance_date` (`maintenance_date`),
  KEY `idx_maintenance_logs_task` (`task_id`),
  KEY `idx_maintenance_logs_submission` (`submission_status`,`maintenance_date`),
  KEY `fk_maintenance_logs_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_logs_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_logs_technician` FOREIGN KEY (`technician_id`) REFERENCES `technicians` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_logs_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_maintenance_logs_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_maintenance_logs_task` FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maintenance_notifications`
--

DROP TABLE IF EXISTS `maintenance_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned DEFAULT NULL,
  `machine_id` int unsigned DEFAULT NULL,
  `technician_id` bigint unsigned DEFAULT NULL,
  `notification_type` enum('MACHINE_BREAKDOWN','TASK_ASSIGNED','TASK_REASSIGNED','TASK_DUE_SOON','TASK_DUE_TODAY','TASK_OVERDUE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_email` varchar(254) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','PROCESSING','SENT','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `provider_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_status_at` datetime DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `deduplication_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notification_deduplication` (`deduplication_key`),
  KEY `idx_notification_status_schedule` (`status`,`scheduled_at`),
  KEY `idx_notification_task` (`task_id`),
  KEY `idx_notification_machine` (`machine_id`),
  KEY `idx_notification_technician` (`technician_id`),
  KEY `idx_notification_type_created` (`notification_type`,`created_at`),
  KEY `idx_notification_provider_message` (`provider_message_id`),
  CONSTRAINT `fk_notifications_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_task` FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_technician` FOREIGN KEY (`technician_id`) REFERENCES `technicians` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maintenance_notification_settings`
--

DROP TABLE IF EXISTS `maintenance_notification_settings`;
CREATE TABLE `maintenance_notification_settings` (
  `notification_type` enum('MACHINE_BREAKDOWN','TASK_ASSIGNED','TASK_REASSIGNED','TASK_DUE_SOON','TASK_DUE_TODAY','TASK_OVERDUE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` bigint unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_type`),
  KEY `fk_notification_settings_user` (`updated_by`),
  CONSTRAINT `fk_notification_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `maintenance_notification_settings` (`notification_type`, `enabled`) VALUES
('MACHINE_BREAKDOWN',1),('TASK_ASSIGNED',1),('TASK_REASSIGNED',1),
('TASK_DUE_SOON',1),('TASK_DUE_TODAY',1),('TASK_OVERDUE',1);

--
-- Table structure for table `maintenance_tasks`
--

DROP TABLE IF EXISTS `maintenance_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `maintenance_type` enum('CORRECTIVE','PREVENTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CORRECTIVE',
  `machine_id` int unsigned DEFAULT NULL,
  `technician_id` bigint unsigned DEFAULT NULL,
  `workshop_id` smallint unsigned DEFAULT NULL,
  `assigned_by` bigint unsigned DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `due_date` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_machine` (`machine_id`),
  KEY `idx_tasks_technician` (`technician_id`),
  KEY `idx_tasks_workshop` (`workshop_id`),
  KEY `idx_tasks_status_due` (`status`,`due_date`),
  KEY `idx_tasks_assigned_by` (`assigned_by`),
  CONSTRAINT `fk_tasks_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_technician` FOREIGN KEY (`technician_id`) REFERENCES `technicians` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_records`
--

DROP TABLE IF EXISTS `production_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL,
  `shift` enum('day','evening','night') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'day',
  `product` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workshop_id` smallint unsigned DEFAULT NULL,
  `machine_id` int unsigned DEFAULT NULL,
  `target_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `produced_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `accepted_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `rejected_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_production_workshop_date` (`workshop_id`,`production_date`),
  KEY `idx_production_machine_date` (`machine_id`,`production_date`),
  KEY `fk_production_records_user` (`created_by_user_id`),
  CONSTRAINT `fk_production_records_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_production_records_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_production_records_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technicians`
--

DROP TABLE IF EXISTS `technicians`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technicians` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `availability_status` enum('available','busy','unavailable') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `skill` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shift_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attendance_status` enum('present','absent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `hire_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_technicians_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_technician_insert` BEFORE INSERT ON `technicians` FOR EACH ROW BEGIN
    IF NEW.user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE id = NEW.user_id
          AND role_id = 3
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Only users with role_id 3 can be added to technicians';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_technicians_role_insert` BEFORE INSERT ON `technicians` FOR EACH ROW BEGIN
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users` WHERE `id` = NEW.user_id AND `role_id` = 3
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Technician must be linked to a user with role_id = 3';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_technician_update` BEFORE UPDATE ON `technicians` FOR EACH ROW BEGIN
    IF NEW.user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE id = NEW.user_id
          AND role_id = 3
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Only users with role_id 3 can be linked to technicians';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_technicians_role_update` BEFORE UPDATE ON `technicians` FOR EACH ROW BEGIN
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users` WHERE `id` = NEW.user_id AND `role_id` = 3
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Technician must be linked to a user with role_id = 3';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int unsigned NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `token_version` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `after_user_create_technician` AFTER INSERT ON `users` FOR EACH ROW BEGIN
    IF NEW.role_id = 3 THEN
        INSERT INTO technicians (
            user_id,
            name,
            email
        )
        VALUES (
            NEW.id,
            NEW.full_name,
            NEW.email
        );
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_users_create_technician_after_role_update` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
    IF NEW.role_id = 3 AND OLD.role_id <> 3 THEN

        INSERT INTO technicians (
            user_id,
            name,
            phone,
            email,
            availability_status
        )
        VALUES (
            NEW.id,
            NEW.full_name,
            NULL,
            NEW.email,
            'available'
        )
        ON DUPLICATE KEY UPDATE
            name = NEW.full_name,
            email = NEW.email;

    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_users_remove_technician_after_role_update` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
    IF OLD.role_id = 3 AND NEW.role_id <> 3 THEN

        DELETE FROM technicians
        WHERE user_id = OLD.id;

    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `warehouse_movements`
--

DROP TABLE IF EXISTS `warehouse_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `part_id` bigint unsigned NOT NULL,
  `movement_type` enum('in','out','adjust') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_warehouse_movements_part_date` (`part_id`,`created_at`),
  KEY `idx_warehouse_movements_date` (`created_at`),
  KEY `fk_warehouse_movements_user` (`created_by_user_id`),
  CONSTRAINT `fk_warehouse_movements_part` FOREIGN KEY (`part_id`) REFERENCES `warehouse_parts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_warehouse_movements_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `warehouse_parts`
--

DROP TABLE IF EXISTS `warehouse_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_parts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `minimum_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `unit_cost` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouse_parts_sku` (`sku`),
  KEY `idx_warehouse_parts_name` (`name`),
  KEY `idx_warehouse_parts_stock` (`stock_quantity`,`minimum_quantity`),
  KEY `fk_warehouse_parts_user` (`created_by_user_id`),
  CONSTRAINT `fk_warehouse_parts_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workshops`
--

DROP TABLE IF EXISTS `workshops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workshops` (
  `name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `name_fr` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'spa_el_fath'
--

--
-- Dumping routines for database 'spa_el_fath'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Phase 1 additions (password reset + schema parity).
-- These tables are also created by sql/202611110001_phase1_core_fixes.sql for
-- databases that were initialized from an earlier dump.

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `request_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_token` (`token_hash`),
  KEY `idx_password_reset_user` (`user_id`,`expires_at`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cmms_safety_inspections`;
CREATE TABLE `cmms_safety_inspections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `machine_id` int unsigned DEFAULT NULL,
  `inspection_date` date NOT NULL,
  `inspector` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` enum('COMPLIANT','OBSERVATION','HAZARD') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OBSERVATION',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_safety_date` (`inspection_date`),
  KEY `idx_safety_machine` (`machine_id`),
  CONSTRAINT `fk_safety_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_safety_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cmms_machine_documents`;
CREATE TABLE `cmms_machine_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `machine_id` int unsigned DEFAULT NULL,
  `document_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OTHER',
  `reference_code` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_location` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_machine_docs_machine` (`machine_id`),
  CONSTRAINT `fk_machine_docs_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_machine_docs_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_preferences`;
CREATE TABLE `user_preferences` (
  `user_id` bigint unsigned NOT NULL,
  `language` enum('ar','fr','en') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ar',
  `theme` enum('light','dark','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `accent` enum('blue','teal','violet','amber') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'blue',
  `density` enum('comfortable','compact') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'comfortable',
  `alert_preferences` json DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phase 2 additions (session revocation + migration tracking).

DROP TABLE IF EXISTS `revoked_sessions`;
CREATE TABLE `revoked_sessions` (
  `jti` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reason` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'logout',
  PRIMARY KEY (`jti`),
  KEY `idx_revoked_sessions_user` (`user_id`,`expires_at`),
  KEY `idx_revoked_sessions_expiry` (`expires_at`),
  CONSTRAINT `fk_revoked_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
  `filename` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('APPLIED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'APPLIED',
  `applied_at` datetime DEFAULT NULL,
  `execution_ms` int unsigned NOT NULL DEFAULT '0',
  `error` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dump completed on 2026-11-04 13:36:14

-- Phase 4 hidden failure findings. Additive and repeat-safe.
-- One row per machine/category/key fingerprint. workflow status is preserved
-- by the runner so acknowledged or resolved findings are not reopened by old
-- evidence. Evidence stores source record ids for traceability.

CREATE TABLE IF NOT EXISTS cmms_hidden_failure_findings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fingerprint CHAR(64) NOT NULL,
  machine_id INT UNSIGNED NOT NULL,
  category VARCHAR(60) NOT NULL,
  finding_key VARCHAR(160) NOT NULL DEFAULT '',
  risk_level ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  risk_score TINYINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  explanation TEXT NULL,
  recommendation_code VARCHAR(60) NOT NULL,
  recommendation TEXT NULL,
  evidence JSON NULL,
  score_factors JSON NULL,
  window_days SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  first_evidence_at DATETIME NULL,
  last_evidence_at DATETIME NULL,
  detected_at DATETIME NOT NULL,
  status ENUM('OPEN','ACKNOWLEDGED','REVIEW','RESOLVED') NOT NULL DEFAULT 'OPEN',
  note VARCHAR(1000) NULL,
  acknowledged_by BIGINT UNSIGNED NULL,
  acknowledged_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hidden_failure_fingerprint (fingerprint),
  KEY idx_hidden_failure_machine (machine_id, status),
  KEY idx_hidden_failure_risk (status, risk_score),
  KEY idx_hidden_failure_category (category),
  CONSTRAINT fk_hidden_failure_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_hidden_failure_ack_user FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_hidden_failure_review_user FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_hidden_failure_resolve_user FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phase 6 scheduled maintenance Excel export schedules and execution history.
CREATE TABLE IF NOT EXISTS cmms_maintenance_export_schedules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  frequency ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily',
  export_time VARCHAR(8) NOT NULL DEFAULT '02:00',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Algiers',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_run_at DATETIME NULL,
  last_status ENUM('IDLE','SUCCESS','FAILED') NOT NULL DEFAULT 'IDLE',
  retention_days INT UNSIGNED NOT NULL DEFAULT 30,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cmms_export_schedules_enabled (enabled, frequency, last_run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_maintenance_export_executions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id INT UNSIGNED NULL,
  status ENUM('RUNNING','SUCCESS','FAILED') NOT NULL DEFAULT 'RUNNING',
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT UNSIGNED NULL,
  record_count INT UNSIGNED NULL,
  error_message TEXT NULL,
  triggered_by ENUM('SCHEDULER','MANUAL') NOT NULL DEFAULT 'SCHEDULER',
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cmms_export_executions_schedule (schedule_id, status, started_at DESC),
  KEY idx_cmms_export_executions_status (status, started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


