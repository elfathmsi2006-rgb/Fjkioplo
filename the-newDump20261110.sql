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
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_trail`
--

LOCK TABLES `audit_trail` WRITE;
/*!40000 ALTER TABLE `audit_trail` DISABLE KEYS */;
INSERT INTO `audit_trail` VALUES (1,'machines','205','INSERT',1,'2026-10-29 21:54:02',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": null, \"state\": \"working\", \"m_type\": null, \"name_en\": \"Hmed\", \"name_fr\": \"Hmed\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": null, \"serial_number\": null, \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(2,'machines','205','UPDATE',1,'2026-10-29 22:03:29',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Hmed the best\", \"state\": \"working\", \"m_type\": null, \"name_en\": \"Hmed\", \"name_fr\": \"Hmed\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"Hmed\", \"serial_number\": null, \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(3,'machines','206','INSERT',1,'2026-10-29 23:57:13',NULL,'{\"id\": 206, \"code\": \"M998\", \"name\": \"JUDE\", \"model\": null, \"notes\": null, \"state\": \"working\", \"m_type\": null, \"name_en\": \"JUDE\", \"name_fr\": \"JUDE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": null, \"serial_number\": null, \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(4,'machines','205','UPDATE',1,'2026-10-30 00:14:29',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Hmed the best\", \"state\": \"working\", \"m_type\": null, \"name_en\": \"Hmed\", \"name_fr\": null, \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"Hmed\", \"serial_number\": null, \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(5,'machines','205','UPDATE',1,'2026-10-30 00:14:33',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Hmed the best\", \"state\": \"working\", \"m_type\": null, \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"Hmed\", \"serial_number\": null, \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(6,'machines','205','UPDATE',1,'2026-10-30 00:14:40',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Hmed the best\", \"state\": \"working\", \"m_type\": \"HUMAIN\", \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"Hmed\", \"serial_number\": null, \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(7,'machines','205','UPDATE',1,'2026-10-30 00:14:50',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Hmed the best\", \"state\": \"working\", \"m_type\": \"HUMAIN\", \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"Hmed\", \"serial_number\": \"Hmed1500ProMax\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(8,'machines','205','UPDATE',1,'2026-10-30 00:14:58',NULL,'{\"id\": 205, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Hmed the best\", \"state\": \"working\", \"m_type\": \"HUMAIN\", \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": \"2000\", \"workshop_id\": 1, \"install_date\": \"2000-12-17T11:00:00.000Z\", \"listed_state\": null, \"manufacturer\": \"Hmed\", \"serial_number\": \"Hmed1500ProMax\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(9,'machines','206','DELETE',1,'2026-10-30 00:20:11',NULL,'{\"message\": \"Machine deleted successfully.\"}'),(10,'machines','205','DELETE',1,'2026-10-30 00:21:31',NULL,'{\"message\": \"Machine deleted successfully.\"}'),(11,'machines','207','INSERT',1,'2026-10-30 00:22:54',NULL,'{\"id\": 207, \"code\": \"M999\", \"name\": \"Hmed\", \"model\": null, \"notes\": \"Buck Broken\", \"state\": \"working\", \"m_type\": \"HUMAIN\", \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": \"2000\", \"workshop_id\": 1, \"install_date\": \"2000-12-17T11:00:00.000Z\", \"listed_state\": null, \"manufacturer\": null, \"serial_number\": \"Hmed125ProMax\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"last_maintenance_date\": null, \"next_maintenance_date\": null, \"production_line_position\": null}'),(12,'maintenance_tasks','1','UPDATE',1,'2026-10-30 00:50:13',NULL,'{\"id\": 1, \"title\": \"Whatsapptest\", \"status\": \"IN_PROGRESS\", \"due_date\": \"2026-12-16T10:59:59.000Z\", \"priority\": \"LOW\", \"created_at\": \"2026-10-27T00:51:20.000Z\", \"machine_id\": 104, \"started_at\": \"2026-10-30T00:50:13.000Z\", \"updated_at\": \"2026-10-30T00:50:13.000Z\", \"assigned_by\": 1, \"description\": null, \"workshop_id\": 8, \"completed_at\": \"2026-10-27T19:35:51.000Z\", \"machine_code\": \"M095\", \"machine_name\": \"BALANCE (3 porte)\", \"technician_id\": 3, \"workshop_name\": \"ATELIER LAOUATE\", \"technician_name\": \"Whatsapptest\", \"maintenance_type\": \"CORRECTIVE\"}'),(13,'maintenance_tasks','1','UPDATE',1,'2026-10-30 00:50:14',NULL,'{\"id\": 1, \"title\": \"Whatsapptest\", \"status\": \"PENDING\", \"due_date\": \"2026-12-16T10:59:59.000Z\", \"priority\": \"LOW\", \"created_at\": \"2026-10-27T00:51:20.000Z\", \"machine_id\": 104, \"started_at\": \"2026-10-30T00:50:13.000Z\", \"updated_at\": \"2026-10-30T00:50:14.000Z\", \"assigned_by\": 1, \"description\": null, \"workshop_id\": 8, \"completed_at\": \"2026-10-27T19:35:51.000Z\", \"machine_code\": \"M095\", \"machine_name\": \"BALANCE (3 porte)\", \"technician_id\": 3, \"workshop_name\": \"ATELIER LAOUATE\", \"technician_name\": \"Whatsapptest\", \"maintenance_type\": \"CORRECTIVE\"}'),(14,'maintenance_tasks','1','UPDATE',1,'2026-10-30 00:50:16',NULL,'{\"id\": 1, \"title\": \"Whatsapptest\", \"status\": \"CANCELLED\", \"due_date\": \"2026-12-16T10:59:59.000Z\", \"priority\": \"LOW\", \"created_at\": \"2026-10-27T00:51:20.000Z\", \"machine_id\": 104, \"started_at\": \"2026-10-30T00:50:13.000Z\", \"updated_at\": \"2026-10-30T00:50:16.000Z\", \"assigned_by\": 1, \"description\": null, \"workshop_id\": 8, \"completed_at\": null, \"machine_code\": \"M095\", \"machine_name\": \"BALANCE (3 porte)\", \"technician_id\": 3, \"workshop_name\": \"ATELIER LAOUATE\", \"technician_name\": \"Whatsapptest\", \"maintenance_type\": \"CORRECTIVE\"}'),(15,'machines','207','DELETE',1,'2026-10-30 00:50:43',NULL,'{\"message\": \"Machine deleted successfully.\"}'),(16,'cmms_breakdown_reports','1','INSERT',1,'2026-11-05 19:05:52',NULL,'{\"role\": \"admin\", \"symptom\": \"j:;,bhkl;jhbk\", \"task_id\": null, \"severity\": \"HIGH\", \"machine_id\": 197}'),(17,'workshops','4','UPDATE',1,'2026-11-05 20:58:12','{\"id\": 4, \"name\": \"ATELIER DE COUTURE FEMMES\", \"manager\": null, \"name_en\": \"ATELIER DE COUTURE FEMMES\", \"name_fr\": \"ATELIER DE COUTURE FEMMES\", \"location\": null, \"manager_phone\": null}','{\"id\": 4, \"name\": \"ATELIER DE COUTURE FEMMES\", \"manager\": \"klmk,\", \"name_en\": \"ATELIER DE COUTURE FEMMES\", \"name_fr\": \"ATELIER DE COUTURE FEMMES\", \"location\": null, \"manager_phone\": \"535656\"}'),(18,'machines','1','UPDATE',1,'2026-11-05 21:10:49','{\"id\": 1, \"code\": \"M001\", \"name\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"model\": \"MULTIMAX PRO\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": \"2024\", \"workshop_id\": 1, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"LAADER BERG\", \"serial_number\": \"563\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": 9, \"production_line_id\": null, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 1, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M001\", \"name\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"model\": \"MULTIMAX PRO\", \"notes\": null, \"state\": \"broken\", \"m_type\": \"MACHINE\", \"name_en\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"name_fr\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"LAADER BERG\", \"serial_number\": \"563\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"production_line_position\": 1}'),(19,'machines','2','UPDATE',1,'2026-11-05 21:10:57','{\"id\": 2, \"code\": \"M002\", \"name\": \"ONDULEUR POUR LAADER BERG\", \"model\": \"UPS S3T 30 XTD A0\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": null, \"start_year\": \"/\", \"workshop_id\": 1, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"RIELLO UPS\", \"serial_number\": \"AC16UT832240003\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": 0, \"production_line_id\": null, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 2, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M002\", \"name\": \"ONDULEUR POUR LAADER BERG\", \"model\": \"UPS S3T 30 XTD A0\", \"notes\": null, \"state\": \"maintenance\", \"m_type\": \"MACHINE\", \"name_en\": \"ONDULEUR POUR LAADER BERG\", \"name_fr\": \"ONDULEUR POUR LAADER BERG\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"RIELLO UPS\", \"serial_number\": \"AC16UT832240003\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"production_line_position\": 2}'),(20,'machines','2','UPDATE',1,'2026-11-05 21:11:02','{\"id\": 2, \"code\": \"M002\", \"name\": \"ONDULEUR POUR LAADER BERG\", \"model\": \"UPS S3T 30 XTD A0\", \"notes\": null, \"state\": \"maintenance\", \"m_type\": \"MACHINE\", \"name_en\": \"ONDULEUR POUR LAADER BERG\", \"name_fr\": \"ONDULEUR POUR LAADER BERG\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"RIELLO UPS\", \"serial_number\": \"AC16UT832240003\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 2, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M002\", \"name\": \"ONDULEUR POUR LAADER BERG\", \"model\": \"UPS S3T 30 XTD A0\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"ONDULEUR POUR LAADER BERG\", \"name_fr\": \"ONDULEUR POUR LAADER BERG\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"RIELLO UPS\", \"serial_number\": \"AC16UT832240003\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"production_line_position\": 2}'),(21,'machines','1','UPDATE',1,'2026-11-05 21:11:03','{\"id\": 1, \"code\": \"M001\", \"name\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"model\": \"MULTIMAX PRO\", \"notes\": null, \"state\": \"broken\", \"m_type\": \"MACHINE\", \"name_en\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"name_fr\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"LAADER BERG\", \"serial_number\": \"563\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 1, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M001\", \"name\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"model\": \"MULTIMAX PRO\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"name_fr\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"LAADER BERG\", \"serial_number\": \"563\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"production_line_position\": 1}'),(22,'machines','1','UPDATE',1,'2026-11-05 21:58:19','{\"id\": 1, \"code\": \"M001\", \"name\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"model\": \"MULTIMAX PRO\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"name_fr\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"LAADER BERG\", \"serial_number\": \"563\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 1, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M001\", \"name\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"model\": \"MULTIMAX PRO\", \"notes\": null, \"state\": \"broken\", \"m_type\": \"MACHINE\", \"name_en\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"name_fr\": \"LIGNE DE PRODUCTION DE LA MOUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"LAADER BERG\", \"serial_number\": \"563\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"production_line_position\": 1}'),(23,'machines','2','UPDATE',1,'2026-11-05 21:58:40','{\"id\": 2, \"code\": \"M002\", \"name\": \"ONDULEUR POUR LAADER BERG\", \"model\": \"UPS S3T 30 XTD A0\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"ONDULEUR POUR LAADER BERG\", \"name_fr\": \"ONDULEUR POUR LAADER BERG\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"RIELLO UPS\", \"serial_number\": \"AC16UT832240003\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 2, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M002\", \"name\": \"ONDULEUR POUR LAADER BERG\", \"model\": \"UPS S3T 30 XTD A0\", \"notes\": null, \"state\": \"broken\", \"m_type\": \"MACHINE\", \"name_en\": \"ONDULEUR POUR LAADER BERG\", \"name_fr\": \"ONDULEUR POUR LAADER BERG\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 1, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"RIELLO UPS\", \"serial_number\": \"AC16UT832240003\", \"workshop_name\": \"ATELIER PRODUCTION DE MOUSSE\", \"intervention_nbr\": null, \"production_line_id\": null, \"next_maintenance_date\": null, \"production_line_position\": 2}'),(24,'cmms_preventive_plans','1','UPDATE',1,'2026-11-05 21:59:12','{\"id\": 1, \"title\": \"lhgdssghj\", \"active\": 1, \"created_at\": \"2026-11-05T19:03:09.000Z\", \"created_by\": 1, \"machine_id\": 203, \"updated_at\": \"2026-11-05T19:03:09.000Z\", \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"lhgdssghj\", \"active\": 0, \"machine_id\": 203, \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30}'),(25,'cmms_preventive_plans','2','UPDATE',1,'2026-11-05 21:59:13','{\"id\": 2, \"title\": \"jbnkljhk\", \"active\": 1, \"created_at\": \"2026-11-05T19:06:09.000Z\", \"created_by\": 1, \"machine_id\": 197, \"updated_at\": \"2026-11-05T19:07:24.000Z\", \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"jbnkljhk\", \"active\": 0, \"machine_id\": 197, \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30}'),(26,'cmms_preventive_plans','1','UPDATE',1,'2026-11-05 21:59:40','{\"id\": 1, \"title\": \"lhgdssghj\", \"active\": 0, \"created_at\": \"2026-11-05T19:03:09.000Z\", \"created_by\": 1, \"machine_id\": 203, \"updated_at\": \"2026-11-05T21:59:12.000Z\", \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"lhgdssghj\", \"active\": 1, \"machine_id\": 203, \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30}'),(27,'cmms_preventive_plans','2','UPDATE',1,'2026-11-05 21:59:41','{\"id\": 2, \"title\": \"jbnkljhk\", \"active\": 0, \"created_at\": \"2026-11-05T19:06:09.000Z\", \"created_by\": 1, \"machine_id\": 197, \"updated_at\": \"2026-11-05T21:59:13.000Z\", \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"jbnkljhk\", \"active\": 1, \"machine_id\": 197, \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30}'),(28,'cmms_preventive_plans','1','UPDATE',1,'2026-11-05 21:59:46','{\"id\": 1, \"title\": \"lhgdssghj\", \"active\": 1, \"created_at\": \"2026-11-05T19:03:09.000Z\", \"created_by\": 1, \"machine_id\": 203, \"updated_at\": \"2026-11-05T21:59:40.000Z\", \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"lhgdssghj\", \"active\": 0, \"machine_id\": 203, \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30}'),(29,'cmms_preventive_plans','2','UPDATE',1,'2026-11-05 21:59:46','{\"id\": 2, \"title\": \"jbnkljhk\", \"active\": 1, \"created_at\": \"2026-11-05T19:06:09.000Z\", \"created_by\": 1, \"machine_id\": 197, \"updated_at\": \"2026-11-05T21:59:41.000Z\", \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"jbnkljhk\", \"active\": 0, \"machine_id\": 197, \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30}'),(30,'cmms_preventive_plans','1','UPDATE',1,'2026-11-05 21:59:52','{\"id\": 1, \"title\": \"lhgdssghj\", \"active\": 0, \"created_at\": \"2026-11-05T19:03:09.000Z\", \"created_by\": 1, \"machine_id\": 203, \"updated_at\": \"2026-11-05T21:59:46.000Z\", \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"lhgdssghj\", \"active\": 1, \"machine_id\": 203, \"description\": \",nbvckl\", \"next_due_at\": \"2026-11-06T11:00:00.000Z\", \"frequency_days\": 30}'),(31,'cmms_preventive_plans','2','UPDATE',1,'2026-11-05 21:59:54','{\"id\": 2, \"title\": \"jbnkljhk\", \"active\": 0, \"created_at\": \"2026-11-05T19:06:09.000Z\", \"created_by\": 1, \"machine_id\": 197, \"updated_at\": \"2026-11-05T21:59:46.000Z\", \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"jbnkljhk\", \"active\": 1, \"machine_id\": 197, \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30}'),(32,'cmms_preventive_plans','2','UPDATE',1,'2026-11-09 02:26:33','{\"id\": 2, \"title\": \"jbnkljhk\", \"active\": 1, \"created_at\": \"2026-11-05T19:06:09.000Z\", \"created_by\": 1, \"machine_id\": 197, \"updated_at\": \"2026-11-05T21:59:54.000Z\", \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"jbnkljhk\", \"active\": 0, \"machine_id\": 197, \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30}'),(33,'cmms_preventive_plans','2','UPDATE',1,'2026-11-09 02:26:33','{\"id\": 2, \"title\": \"jbnkljhk\", \"active\": 0, \"created_at\": \"2026-11-05T19:06:09.000Z\", \"created_by\": 1, \"machine_id\": 197, \"updated_at\": \"2026-11-09T02:26:33.000Z\", \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30, \"last_completed_at\": null}','{\"title\": \"jbnkljhk\", \"active\": 1, \"machine_id\": 197, \"description\": null, \"next_due_at\": \"2026-12-04T11:00:00.000Z\", \"frequency_days\": 30}'),(34,'maintenance_tasks','9','INSERT',1,'2026-11-09 02:27:09',NULL,'{\"id\": 9, \"title\": \"fvfg\", \"status\": \"IN_PROGRESS\", \"due_date\": \"1999-09-10T10:59:59.000Z\", \"priority\": \"CRITICAL\", \"created_at\": \"2026-11-09T02:27:09.000Z\", \"machine_id\": 193, \"started_at\": \"2026-11-09T02:27:09.000Z\", \"updated_at\": \"2026-11-09T02:27:09.000Z\", \"assigned_by\": 1, \"description\": \"gffgfsdg\", \"workshop_id\": 9, \"completed_at\": null, \"machine_code\": \"M193\", \"machine_name\": \"COMPRESSEUE DAIR \", \"technician_id\": null, \"workshop_name\": \"ATELIER LE ROULER\", \"technician_name\": null, \"maintenance_type\": \"PREVENTIVE\"}'),(35,'maintenance_tasks','10','INSERT',1,'2026-11-09 19:32:52',NULL,'{\"id\": 10, \"title\": \"cdf\", \"status\": \"PENDING\", \"due_date\": \"1111-11-12T10:59:59.000Z\", \"priority\": \"MEDIUM\", \"created_at\": \"2026-11-09T19:32:52.000Z\", \"machine_id\": 152, \"started_at\": null, \"updated_at\": \"2026-11-09T19:32:52.000Z\", \"assigned_by\": 1, \"description\": \"scs\", \"workshop_id\": 7, \"completed_at\": null, \"machine_code\": \"M142\", \"machine_name\": \"CONVOYEUR 12\", \"technician_id\": null, \"workshop_name\": \"ATELIER DE COUTURE\", \"technician_name\": null, \"maintenance_type\": \"CORRECTIVE\"}'),(36,'maintenance_tasks','11','INSERT',1,'2026-11-09 19:34:16',NULL,'{\"id\": 11, \"title\": \"fedsf\", \"status\": \"IN_PROGRESS\", \"due_date\": \"2200-11-12T10:59:59.000Z\", \"priority\": \"CRITICAL\", \"created_at\": \"2026-11-09T19:34:16.000Z\", \"machine_id\": 186, \"started_at\": \"2026-11-09T19:34:17.000Z\", \"updated_at\": \"2026-11-09T19:34:16.000Z\", \"assigned_by\": 1, \"description\": \"fdsfd\", \"workshop_id\": 4, \"completed_at\": null, \"machine_code\": \"M186\", \"machine_name\": \"POMPE D\'EAU\", \"technician_id\": null, \"workshop_name\": \"ATELIER DE COUTURE FEMMES\", \"technician_name\": null, \"maintenance_type\": \"CORRECTIVE\"}'),(37,'maintenance_tasks','12','INSERT',1,'2026-11-09 19:53:09',NULL,'{\"id\": 12, \"title\": \"fdgh\", \"status\": \"IN_PROGRESS\", \"due_date\": \"1111-11-12T10:59:59.000Z\", \"priority\": \"HIGH\", \"created_at\": \"2026-11-09T19:53:09.000Z\", \"machine_id\": 191, \"started_at\": \"2026-11-09T19:53:10.000Z\", \"updated_at\": \"2026-11-09T19:53:09.000Z\", \"assigned_by\": 1, \"description\": \"gf\", \"workshop_id\": 4, \"completed_at\": null, \"machine_code\": \"M191\", \"machine_name\": \"COMPRESSEUE DAIR \", \"technician_id\": null, \"workshop_name\": \"ATELIER DE COUTURE FEMMES\", \"technician_name\": null, \"maintenance_type\": \"CORRECTIVE\"}'),(38,'maintenance_tasks','12','DELETE',1,'2026-11-09 19:59:33','{\"id\": 12, \"title\": \"fdgh\", \"status\": \"IN_PROGRESS\", \"due_date\": \"1111-11-12T10:59:59.000Z\", \"priority\": \"HIGH\", \"created_at\": \"2026-11-09T19:53:09.000Z\", \"machine_id\": 191, \"started_at\": \"2026-11-09T19:53:10.000Z\", \"updated_at\": \"2026-11-09T19:53:09.000Z\", \"assigned_by\": 1, \"description\": \"gf\", \"workshop_id\": 4, \"completed_at\": null, \"technician_id\": null, \"maintenance_type\": \"CORRECTIVE\"}',NULL),(39,'maintenance_tasks','11','DELETE',1,'2026-11-09 19:59:36','{\"id\": 11, \"title\": \"fedsf\", \"status\": \"IN_PROGRESS\", \"due_date\": \"2200-11-12T10:59:59.000Z\", \"priority\": \"CRITICAL\", \"created_at\": \"2026-11-09T19:34:16.000Z\", \"machine_id\": 186, \"started_at\": \"2026-11-09T19:34:17.000Z\", \"updated_at\": \"2026-11-09T19:34:16.000Z\", \"assigned_by\": 1, \"description\": \"fdsfd\", \"workshop_id\": 4, \"completed_at\": null, \"technician_id\": null, \"maintenance_type\": \"CORRECTIVE\"}',NULL),(40,'maintenance_tasks','10','DELETE',1,'2026-11-09 19:59:55','{\"id\": 10, \"title\": \"cdf\", \"status\": \"PENDING\", \"due_date\": \"1111-11-12T10:59:59.000Z\", \"priority\": \"MEDIUM\", \"created_at\": \"2026-11-09T19:32:52.000Z\", \"machine_id\": 152, \"started_at\": null, \"updated_at\": \"2026-11-09T19:32:52.000Z\", \"assigned_by\": 1, \"description\": \"scs\", \"workshop_id\": 7, \"completed_at\": null, \"technician_id\": null, \"maintenance_type\": \"CORRECTIVE\"}',NULL),(41,'maintenance_tasks','9','DELETE',1,'2026-11-09 21:13:05','{\"id\": 9, \"title\": \"fvfg\", \"status\": \"IN_PROGRESS\", \"due_date\": \"1999-09-10T10:59:59.000Z\", \"priority\": \"CRITICAL\", \"created_at\": \"2026-11-09T02:27:09.000Z\", \"machine_id\": 193, \"started_at\": \"2026-11-09T02:27:09.000Z\", \"updated_at\": \"2026-11-09T20:46:11.000Z\", \"assigned_by\": 1, \"description\": \"gffgfsdg\", \"workshop_id\": 9, \"completed_at\": null, \"escalated_at\": \"2026-11-09T20:46:11.000Z\", \"technician_id\": null, \"blocked_reason\": null, \"maintenance_type\": \"PREVENTIVE\"}',NULL),(42,'maintenance_tasks','6','DELETE',1,'2026-11-09 21:13:40','{\"id\": 6, \"title\": \"FIX\", \"status\": \"PENDING\", \"due_date\": \"2027-12-16T10:59:59.000Z\", \"priority\": \"LOW\", \"created_at\": \"2026-11-06T00:32:24.000Z\", \"machine_id\": 195, \"started_at\": null, \"updated_at\": \"2026-11-06T00:32:24.000Z\", \"assigned_by\": 1, \"description\": \"FIX THAT DAMNED MACHINE\", \"workshop_id\": 1, \"completed_at\": null, \"escalated_at\": null, \"technician_id\": 6, \"blocked_reason\": null, \"maintenance_type\": \"CORRECTIVE\"}',NULL),(43,'maintenance_tasks','8','UPDATE',1,'2026-11-09 21:46:05','{\"id\": 8, \"title\": \"PM: jhk\", \"status\": \"IN_PROGRESS\", \"due_date\": \"2026-11-08T11:00:00.000Z\", \"priority\": \"MEDIUM\", \"created_at\": \"2026-11-08T20:16:06.000Z\", \"machine_id\": 153, \"started_at\": null, \"updated_at\": \"2026-11-09T20:46:11.000Z\", \"assigned_by\": null, \"description\": \"kjhk\", \"workshop_id\": 9, \"completed_at\": null, \"escalated_at\": \"2026-11-09T20:46:11.000Z\", \"technician_id\": 4, \"blocked_reason\": null, \"maintenance_type\": \"PREVENTIVE\"}','{\"id\": 8, \"title\": \"Changed\", \"status\": \"IN_PROGRESS\", \"due_date\": \"2026-11-09T10:59:59.000Z\", \"priority\": \"MEDIUM\", \"created_at\": \"2026-11-08T20:16:06.000Z\", \"machine_id\": 153, \"started_at\": \"2026-11-09T21:46:05.000Z\", \"updated_at\": \"2026-11-09T21:46:05.000Z\", \"assigned_by\": null, \"description\": \"kjhk\", \"workshop_id\": 9, \"completed_at\": null, \"escalated_at\": \"2026-11-09T20:46:11.000Z\", \"machine_code\": \"M143\", \"machine_name\": \"CONVOYEUR 13\", \"technician_id\": 4, \"workshop_name\": \"ATELIER LE ROULER\", \"blocked_reason\": null, \"technician_name\": \"Henni Younes\", \"maintenance_type\": \"PREVENTIVE\"}'),(44,'machines','121','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 121, \"code\": \"M112\", \"name\": \"CROSS-LAPPER\", \"model\": \"HYPW-250*400\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 4, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 7, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M112\", \"name\": \"CROSS-LAPPER\", \"model\": \"HYPW-250*400\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"CROSS-LAPPER\", \"name_fr\": \"CROSS-LAPPER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 7}'),(45,'machines','122','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 122, \"code\": \"M113\", \"name\": \"DRAFTER\", \"model\": \"YYLQ-310\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YANG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 1, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 8, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M113\", \"name\": \"DRAFTER\", \"model\": \"YYLQ-310\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"DRAFTER\", \"name_fr\": \"DRAFTER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YANG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 8}'),(46,'machines','120','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 120, \"code\": \"M111\", \"name\": \"CARDING MACHINE\", \"model\": \"YYGM-III-225\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 6, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 6, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M111\", \"name\": \"CARDING MACHINE\", \"model\": \"YYGM-III-225\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"CARDING MACHINE\", \"name_fr\": \"CARDING MACHINE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 6}'),(47,'machines','119','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 119, \"code\": \"M110\", \"name\": \"FEEDER\", \"model\": \"YYGM-111-225\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 7, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 5, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M110\", \"name\": \"FEEDER\", \"model\": \"YYGM-111-225\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"FEEDER\", \"name_fr\": \"FEEDER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 5}'),(48,'machines','123','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 123, \"code\": \"M114\", \"name\": \"OVEN\", \"model\": \"/\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 2, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 9, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M114\", \"name\": \"OVEN\", \"model\": \"/\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"OVEN\", \"name_fr\": \"OVEN\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 9}'),(49,'machines','124','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 124, \"code\": \"M115\", \"name\": \"WINDER AND CUTTER\", \"model\": \"YYXT-310\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 10, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M115\", \"name\": \"WINDER AND CUTTER\", \"model\": \"YYXT-310\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"WINDER AND CUTTER\", \"name_fr\": \"WINDER AND CUTTER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 10}'),(50,'machines','118','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 118, \"code\": \"M109\", \"name\": \"MAIN OPENER\", \"model\": \"YYKB-111-150\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 9, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 4, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M109\", \"name\": \"MAIN OPENER\", \"model\": \"YYKB-111-150\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"MAIN OPENER\", \"name_fr\": \"MAIN OPENER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 4}'),(51,'machines','116','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 116, \"code\": \"M107\", \"name\": \"PRE OPENER\", \"model\": \"YYKB-111-150\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 2, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M107\", \"name\": \"PRE OPENER\", \"model\": \"YYKB-111-150\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"PRE OPENER\", \"name_fr\": \"PRE OPENER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 2}'),(52,'machines','117','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 117, \"code\": \"M108\", \"name\": \"BIG BLANDER\", \"model\": \"/\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 3, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M108\", \"name\": \"BIG BLANDER\", \"model\": \"/\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"BIG BLANDER\", \"name_fr\": \"BIG BLANDER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 3}'),(53,'machines','115','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 115, \"code\": \"M106\", \"name\": \"BALANCE (4 porte)\", \"model\": \"YYKB-111-160\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"A L\'ARRET\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 1, \"production_line_id\": 2, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 1, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M106\", \"name\": \"BALANCE (4 porte)\", \"model\": \"YYKB-111-160\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"BALANCE (4 porte)\", \"name_fr\": \"BALANCE (4 porte)\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 2, \"next_maintenance_date\": null, \"production_line_position\": 1}'),(54,'machines','112','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 112, \"code\": \"M103\", \"name\": \"WINDER AND CUTTER\", \"model\": \"/\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 1, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 9, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M103\", \"name\": \"WINDER AND CUTTER\", \"model\": \"/\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"WINDER AND CUTTER\", \"name_fr\": \"WINDER AND CUTTER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 1, \"next_maintenance_date\": null, \"production_line_position\": 9}'),(55,'machines','110','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 110, \"code\": \"M101\", \"name\": \"DRAFTER\", \"model\": \"/\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YANG\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 1, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 7, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M101\", \"name\": \"DRAFTER\", \"model\": \"/\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"DRAFTER\", \"name_fr\": \"DRAFTER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YANG\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 1, \"next_maintenance_date\": null, \"production_line_position\": 7}'),(56,'machines','111','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 111, \"code\": \"M102\", \"name\": \"OVEN\", \"model\": \"3200×10000\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 1, \"production_line_id\": 1, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 8, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M102\", \"name\": \"OVEN\", \"model\": \"3200×10000\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"OVEN\", \"name_fr\": \"OVEN\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 1, \"next_maintenance_date\": null, \"production_line_position\": 8}'),(57,'machines','103','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 103, \"code\": \"M094\", \"name\": \"WINDER AND CUTTER\", \"model\": \"YYXT-320\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 10, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M094\", \"name\": \"WINDER AND CUTTER\", \"model\": \"YYXT-320\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"WINDER AND CUTTER\", \"name_fr\": \"WINDER AND CUTTER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 10}'),(58,'machines','100','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 100, \"code\": \"M092\", \"name\": \"NEEDLE 3\", \"model\": \"YYZS-320\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 8, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M092\", \"name\": \"NEEDLE 3\", \"model\": \"YYZS-320\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"NEEDLE 3\", \"name_fr\": \"NEEDLE 3\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 8}'),(59,'machines','102','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 102, \"code\": \"M093\", \"name\": \"ROULEUSSE\", \"model\": \"/\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YONG\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 9, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M093\", \"name\": \"ROULEUSSE\", \"model\": \"/\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"ROULEUSSE\", \"name_fr\": \"ROULEUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YONG\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 9}'),(60,'machines','98','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 98, \"code\": \"M091\", \"name\": \"NEEDLE 2\", \"model\": \"YYZS-320\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 8, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M091\", \"name\": \"NEEDLE 2\", \"model\": \"YYZS-320\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"NEEDLE 2\", \"name_fr\": \"NEEDLE 2\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 8}'),(61,'machines','97','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 97, \"code\": \"M090\", \"name\": \"NEEDLE 1\", \"model\": \"YYZS-340\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 8, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M090\", \"name\": \"NEEDLE 1\", \"model\": \"YYZS-340\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"NEEDLE 1\", \"name_fr\": \"NEEDLE 1\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"YING YONG\", \"serial_number\": \"15/1231B\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 8}'),(62,'machines','96','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 96, \"code\": \"M089\", \"name\": \"CROSS-LAPPER\", \"model\": \"HYPW-250*400\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 1, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 7, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M089\", \"name\": \"CROSS-LAPPER\", \"model\": \"HYPW-250*400\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"CROSS-LAPPER\", \"name_fr\": \"CROSS-LAPPER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 7}'),(63,'machines','88','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 88, \"code\": \"M088\", \"name\": \"CARDING MACHINE\", \"model\": \"HYSL-230\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 6, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M088\", \"name\": \"CARDING MACHINE\", \"model\": \"HYSL-230\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"CARDING MACHINE\", \"name_fr\": \"CARDING MACHINE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 6}'),(64,'machines','86','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 86, \"code\": \"M087\", \"name\": \"VIBRATING FEEDER\", \"model\": \"HYGM-210\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 5, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M087\", \"name\": \"VIBRATING FEEDER\", \"model\": \"HYGM-210\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"VIBRATING FEEDER\", \"name_fr\": \"VIBRATING FEEDER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 5}'),(65,'machines','85','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 85, \"code\": \"M086\", \"name\": \"FINE OPENER\", \"model\": \"HYKS\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 2, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 4, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M086\", \"name\": \"FINE OPENER\", \"model\": \"HYKS\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"FINE OPENER\", \"name_fr\": \"FINE OPENER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 4}'),(66,'machines','84','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 84, \"code\": \"M085\", \"name\": \"BIG BLANDER\", \"model\": \"HYDC-170\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 3, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M085\", \"name\": \"BIG BLANDER\", \"model\": \"HYDC-170\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"BIG BLANDER\", \"name_fr\": \"BIG BLANDER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 3}'),(67,'machines','83','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 83, \"code\": \"M084\", \"name\": \"FEEDING MACHINE\", \"model\": \"/\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 3, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 2, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M084\", \"name\": \"FEEDING MACHINE\", \"model\": \"/\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"FEEDING MACHINE\", \"name_fr\": \"FEEDING MACHINE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"/\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 2}'),(68,'machines','78','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 78, \"code\": \"M083\", \"name\": \"BALANCE (3 porte)\", \"model\": \"HYKB-120\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 4, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 1, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M083\", \"name\": \"BALANCE (3 porte)\", \"model\": \"HYKB-120\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"BALANCE (3 porte)\", \"name_fr\": \"BALANCE (3 porte)\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 4, \"next_maintenance_date\": null, \"production_line_position\": 1}'),(69,'machines','76','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 76, \"code\": \"M082\", \"name\": \"WINDER AND CUTTER\", \"model\": \"HYXT\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 10, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M082\", \"name\": \"WINDER AND CUTTER\", \"model\": \"HYXT\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"WINDER AND CUTTER\", \"name_fr\": \"WINDER AND CUTTER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 10}'),(70,'machines','75','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 75, \"code\": \"M081\", \"name\": \"ROULEUSSE\", \"model\": \"HYTG\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 9, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M081\", \"name\": \"ROULEUSSE\", \"model\": \"HYTG\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"ROULEUSSE\", \"name_fr\": \"ROULEUSSE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 9}'),(71,'machines','74','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 74, \"code\": \"M080\", \"name\": \"NEEDLE (4)\", \"model\": \"HYGZ\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 1, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 8, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M080\", \"name\": \"NEEDLE (4)\", \"model\": \"HYGZ\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"NEEDLE (4)\", \"name_fr\": \"NEEDLE (4)\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 8}'),(72,'machines','64','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 64, \"code\": \"M078\", \"name\": \"CARDING MACHINE\", \"model\": \"HYSL-230\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 2, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 6, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M078\", \"name\": \"CARDING MACHINE\", \"model\": \"HYSL-230\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"CARDING MACHINE\", \"name_fr\": \"CARDING MACHINE\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 6}'),(73,'machines','67','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 67, \"code\": \"M079\", \"name\": \"CROSS-LAPPER\", \"model\": \"HYPW-250*400\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 4, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 7, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M079\", \"name\": \"CROSS-LAPPER\", \"model\": \"HYPW-250*400\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"CROSS-LAPPER\", \"name_fr\": \"CROSS-LAPPER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 7}'),(74,'machines','62','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 62, \"code\": \"M076\", \"name\": \"FINE OPENER\", \"model\": \"HYKS-130\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 4, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M076\", \"name\": \"FINE OPENER\", \"model\": \"HYKS-130\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"FINE OPENER\", \"name_fr\": \"FINE OPENER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 4}'),(75,'machines','63','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 63, \"code\": \"M077\", \"name\": \"FEEDER (2 PARALLELE)\", \"model\": \"HYGM-210\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 5, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M077\", \"name\": \"FEEDER (2 PARALLELE)\", \"model\": \"HYGM-210\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"FEEDER (2 PARALLELE)\", \"name_fr\": \"FEEDER (2 PARALLELE)\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2401\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 5}'),(76,'machines','59','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 59, \"code\": \"M075\", \"name\": \"BIG BLANDER\", \"model\": \"HYDC-170\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 3, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M075\", \"name\": \"BIG BLANDER\", \"model\": \"HYDC-170\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"BIG BLANDER\", \"name_fr\": \"BIG BLANDER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 3}'),(77,'machines','57','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 57, \"code\": \"M074\", \"name\": \"PRE OPENER\", \"model\": \"HYYK-130\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 2, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M074\", \"name\": \"PRE OPENER\", \"model\": \"HYYK-130\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"PRE OPENER\", \"name_fr\": \"PRE OPENER\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 2}'),(78,'machines','51','UPDATE',1,'2026-11-09 23:57:05','{\"id\": 51, \"code\": \"M073\", \"name\": \"BALANCE (3 porte)\", \"model\": \"HYKB-120\", \"notes\": \"\", \"state\": \"EN MARCHE\", \"m_type\": \"MACHINE\", \"name_en\": null, \"name_fr\": null, \"quantity\": 1, \"start_year\": \"\", \"workshop_id\": 8, \"install_date\": null, \"listed_state\": \"EN MARCHE\", \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": 0, \"production_line_id\": 3, \"next_maintenance_date\": null, \"technician_description\": null, \"production_line_position\": 1, \"workshop_chief_description\": null, \"technician_description_updated_at\": null, \"workshop_chief_description_updated_at\": null}','{\"code\": \"M073\", \"name\": \"BALANCE (3 porte)\", \"model\": \"HYKB-120\", \"notes\": null, \"state\": \"working\", \"m_type\": \"MACHINE\", \"name_en\": \"BALANCE (3 porte)\", \"name_fr\": \"BALANCE (3 porte)\", \"quantity\": null, \"start_year\": null, \"workshop_id\": 8, \"install_date\": null, \"listed_state\": null, \"manufacturer\": \"HOAGE\", \"serial_number\": \"2307\", \"workshop_name\": \"ATELIER LAOUATE\", \"intervention_nbr\": null, \"production_line_id\": 3, \"next_maintenance_date\": null, \"production_line_position\": 1}');
/*!40000 ALTER TABLE `audit_trail` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cmms_breakdown_reports`
--

LOCK TABLES `cmms_breakdown_reports` WRITE;
/*!40000 ALTER TABLE `cmms_breakdown_reports` DISABLE KEYS */;
INSERT INTO `cmms_breakdown_reports` VALUES (1,197,NULL,'2026-11-05 19:05:52','HIGH','j:;,bhkl;jhbk','kjhgkjhg','5',NULL,55,1,'2026-11-05 19:05:52');
/*!40000 ALTER TABLE `cmms_breakdown_reports` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cmms_condition_readings`
--

LOCK TABLES `cmms_condition_readings` WRITE;
/*!40000 ALTER TABLE `cmms_condition_readings` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_condition_readings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cmms_machine_documents`
--

DROP TABLE IF EXISTS `cmms_machine_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `fk_machine_docs_creator` (`created_by`),
  CONSTRAINT `fk_machine_docs_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_machine_docs_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cmms_machine_documents`
--

LOCK TABLES `cmms_machine_documents` WRITE;
/*!40000 ALTER TABLE `cmms_machine_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_machine_documents` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cmms_machine_meter_readings`
--

LOCK TABLES `cmms_machine_meter_readings` WRITE;
/*!40000 ALTER TABLE `cmms_machine_meter_readings` DISABLE KEYS */;
INSERT INTO `cmms_machine_meter_readings` VALUES (1,153,'PRODUCTION_UNITS',114.000,'2026-11-08 20:12:50','Manual reading','ùmklù',1,'2026-11-08 20:12:50');
/*!40000 ALTER TABLE `cmms_machine_meter_readings` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cmms_maintenance_manual_links`
--

LOCK TABLES `cmms_maintenance_manual_links` WRITE;
/*!40000 ALTER TABLE `cmms_maintenance_manual_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_maintenance_manual_links` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cmms_pm_checklist_items`
--

LOCK TABLES `cmms_pm_checklist_items` WRITE;
/*!40000 ALTER TABLE `cmms_pm_checklist_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_pm_checklist_items` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cmms_pm_occurrences`
--

LOCK TABLES `cmms_pm_occurrences` WRITE;
/*!40000 ALTER TABLE `cmms_pm_occurrences` DISABLE KEYS */;
INSERT INTO `cmms_pm_occurrences` VALUES (1,2,'2026-11-04 00:00:00',2,'GENERATED','2026-11-05 19:07:24'),(2,1,'2026-11-06 00:00:00',7,'GENERATED','2026-11-08 19:31:06'),(3,3,'2026-11-08 00:00:00',8,'GENERATED','2026-11-08 20:16:06');
/*!40000 ALTER TABLE `cmms_pm_occurrences` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cmms_preventive_plans`
--

LOCK TABLES `cmms_preventive_plans` WRITE;
/*!40000 ALTER TABLE `cmms_preventive_plans` DISABLE KEYS */;
INSERT INTO `cmms_preventive_plans` VALUES (1,203,'lhgdssghj',',nbvckl',30,NULL,'2026-12-06 00:00:00',1,1,'2026-11-05 19:03:09','2026-11-08 19:31:06'),(2,197,'jbnkljhk',NULL,30,NULL,'2026-12-04 00:00:00',1,1,'2026-11-05 19:06:09','2026-11-09 02:26:33'),(3,153,'jhk','kjhk',30,NULL,'2026-12-08 00:00:00',1,1,'2026-11-08 20:12:30','2026-11-08 20:16:06');
/*!40000 ALTER TABLE `cmms_preventive_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cmms_safety_inspections`
--

DROP TABLE IF EXISTS `cmms_safety_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `fk_safety_creator` (`created_by`),
  CONSTRAINT `fk_safety_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_safety_machine` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cmms_safety_inspections`
--

LOCK TABLES `cmms_safety_inspections` WRITE;
/*!40000 ALTER TABLE `cmms_safety_inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_safety_inspections` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cmms_work_order_checklist_results`
--

LOCK TABLES `cmms_work_order_checklist_results` WRITE;
/*!40000 ALTER TABLE `cmms_work_order_checklist_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_work_order_checklist_results` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `cmms_work_order_parts`
--

LOCK TABLES `cmms_work_order_parts` WRITE;
/*!40000 ALTER TABLE `cmms_work_order_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `cmms_work_order_parts` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gmail_connections`
--

LOCK TABLES `gmail_connections` WRITE;
/*!40000 ALTER TABLE `gmail_connections` DISABLE KEYS */;
INSERT INTO `gmail_connections` VALUES (2,1,'elfath.hybrok@gmail.com','Dt0oh0T//GkF2jxt.Il2jBAfZCx+bTo3Zu+Maww==.WP37T9YtMFzLaM0lYB2s4AD/IwVBcbDwy6fQbO+wHKMSJiUusAUn2FL3qV6+nRHoet3VTFfi4Db22l/Hyt4VLMT6MiYn95Apg4PLayj46otHJoKHiuWTGCmRu+hZ//jwu1rYk5bxTQ==','https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send','2026-11-05 13:04:38','2026-11-05 13:04:38');
/*!40000 ALTER TABLE `gmail_connections` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `gmail_oauth_states`
--

LOCK TABLES `gmail_oauth_states` WRITE;
/*!40000 ALTER TABLE `gmail_oauth_states` DISABLE KEYS */;
INSERT INTO `gmail_oauth_states` VALUES ('35b5d3b4f4299925636339c20017b250f8869e57724babe7f88639d84a02d852',1,'2026-11-05 13:06:49','2026-11-05 12:56:49'),('4899338708ccb003f2373187b2cd75201b88daff4e183ea8dd79dfafde536ffa',1,'2026-11-05 13:04:43','2026-11-05 12:54:43'),('fe3f5cc05d58eab79151f33fe9c8c723081c5d018e7e783ff24e0aaece2b16cf',1,'2026-11-05 13:07:16','2026-11-05 12:57:16');
/*!40000 ALTER TABLE `gmail_oauth_states` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `interventions`
--

LOCK TABLES `interventions` WRITE;
/*!40000 ALTER TABLE `interventions` DISABLE KEYS */;
INSERT INTO `interventions` VALUES ('03/10/226','7:30','M112','CROSS-LAPPER','ATELIER LAOUATE (LIGNE02)','HYPW-250*400','15/1231B','M�canique ','Changement de palier glissi�re HG25','palier glissi�re HG25','Ouldhabchi + Hatek','45','','#VALUE!',NULL),('03/10/226','9:05','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','M�canique ','Montage de clavette de Mini-opener','Clavette','Ouldhabchi + Hatek','15','','#VALUE!',NULL),('03/10/226','9:30','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','D�blocage de cylindre de feeding','Aucune ','Ouldhabchi + Hatek','60','','#VALUE!',NULL),('03/10/226','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventive ','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','#VALUE!',NULL),('10/4/2026','7:00','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','D�bobinage du cylindre et d�blocage du feeding','Aucune ','Ouldhabchi + Abbed','30','','',NULL),('10/4/2026','9:30','M096','PRE OPENER','ATELIER LAOUATE (LIGNE01)','YYKS-III-150','/','M�canique ','D�blocage de miniopener et tendage de la chaine','Aucune ','Ouldhabchi + Abbed','60','','',NULL),('10/4/2026','10:30','M095','BALANCE (3 porte)','ATELIER LAOUATE (LIGNE01)','M1200','','M�canique ','Montage de la chaine N�09',' chaine N�08','Ouldhabchi + Abbed','16','','',NULL),('10/4/2026','11:00','M099','CARDING MACHINE','ATELIER LAOUATE (LIGNE01)','/','/','M�canique ','Tendage de la courroie �dent�e de cylindre avant','Aucune ','Ouldhabchi + Abbed','30','','',NULL),('10/4/2026','11:30','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','R�ctification du tapis de cross-lapper','Aucune ','Ouldhabchi + Abbed','20','','',NULL),('10/4/2026','12:00','M102','OVEN','ATELIER LAOUATE (LIGNE01)','3200?10000','/','M�canique ','R�ctification du tapis de four','Aucune ','Ouldhabchi + Abbed','30','','',NULL),('10/4/2026','12:30','M079','CROSS-LAPPER','ATELIER LAOUATE (LIGNE03)','HYPW-250*400','2307','M�canique ','R�glage de tapis de cross-lapper','Aucune ','Ouldhabchi + Abbed','30','','',NULL),('10/4/2026','13:00','M112','CROSS-LAPPER','ATELIER LAOUATE (LIGNE02)','HYPW-250*400','15/1231B','M�canique ','Jauge du cylindre avant','Aucune ','Ouldhabchi + Abbed','15','','',NULL),('10/4/2026','13:00','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electrique ','Electrique ','Aucune ','Electriciens','120','','',NULL),('10/4/2026','13:00','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Soudure','Travaux de soudeur sur presse des bouteilles.','baguettes � souder','Djezzar Noureddine','360','','',NULL),('10/4/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventive ','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/1/2026','6:00','M112','CROSS-LAPPER','ATELIER LAOUATE (LIGNE02)','HYPW-250*400','15/1231B','M�canique ','Retrait de cylindre de cross-lapper( Mercredi soir) , la ligne � l\'arr�t ','Aucune ','Ouldhabchi + Abbed','15','','',NULL),('10/1/2026','6:30','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','D�blocage de mini-opener et de cross-lapper + jauge ','Aucune ','Ouldhabchi + Abbed','360','','',NULL),('10/1/2026','8:00','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electrique ','Montage inverseurs automatic pour le groupe �lectrog�ne Laader-Burg ( en cours ). ','Aucune ','Electriciens','240','','',NULL),('10/1/2026','8:00','M170','COMPRESSEUR  DAIR  ','ATELIER LAOUATE','PASCAL 15-10/500 DF (IE3)','6559000004','Pneumatique','montage l\'installation de circuit d\'air sur le nouveau compresseur ( en cours)','articles de plomberie ','Electriciens','120','','',NULL),('10/1/2026','10:00','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electrique ','Branchement provisoire direct de groupe �lectrog�ne � l\'alimentation ladel-borge.','Aucune ','Electriciens','60','','',NULL),('10/1/2026','12:30','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Pr�ventive ','V�rification les deux chambres froides (TDI & poliole).','Aucune ','Electriciens','60','','',NULL),('10/1/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventive ','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/5/2026','6:00','M111','CARDING MACHINE','ATELIER LAOUATE (LIGNE02)','YYGM-III-225','15/1231B','M�canique ','D�blocage de cardage (d�montage et remontage des courroies )','Aucune ','Ouldhabchi + Abbed','180','','',NULL),('10/5/2026','10:00','M078','CARDING MACHINE','ATELIER LAOUATE (LIGNE03)','HYSL-230','2307','M�canique ','D�blocage de cardage (d�montage et remontage des courroies )','Aucune ','Ouldhabchi + Abbed','120','','',NULL),('10/5/2026','13:00','M099','CARDING MACHINE','ATELIER LAOUATE (LIGNE01)','/','/','M�canique ','Changement de courroie de cardage','Courroie �dent�e EPP 8M 2400','Takfa + Maizi','60','','',NULL),('10/5/2026','9:00','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electrique ','D�branchement de l\'armoire de transfert automatique du groupe �lectrog�ne de 700 kVA.','N�cessaires','Electriciens','300','','',NULL),('10/5/2026','15:00','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electrique ',' D�but de l\'installation de l\'armoire de transfert automatique du groupe �lectrog�ne de 400 kVA','N�cessaires','Electriciens','60','','',NULL),('10/5/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventive ','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/6/2026','6:00','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','Rectification de chemin de tapis de cross-lapper','Aucune ','Ouldhabchi + Houssem','60','','',NULL),('10/6/2026','7:30','M078','CARDING MACHINE','ATELIER LAOUATE (LIGNE03)','HYSL-230','2307','M�canique ','R�glage de tapis de cross-lapper','Aucune ','Ouldhabchi + Houssem','60','','',NULL),('10/6/2026','9:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','M�canique ','Changement de courroie +Palier 207 + Roulement endommag� a changer','Courroie 17 x 1375 + Palier 207','Ouldhabchi + Houssem','120','','',NULL),('10/6/2026','11:00','M086','FINE OPENER','ATELIER LAOUATE (LIGNE04)','HYKS','2401','M�canique ','Changement de roulement','Roulement 6004','Ouldhabchi + Houssem','60','','',NULL),('10/6/2026','9:00','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Montage +Soudure','Suite des travaux d\'am�nagement de la niche de compresseur (en cours)','N�cessaires','Electriciens + Soudeur ','180','','',NULL),('10/6/2026','12:30','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electrique ',' v�rification d\'armoire de pompe TDI','Aucune ','Electriciens','30','','',NULL),('10/6/2026','13:00','M185','GROUPE ELECTROGENE /700kva','ATELIER LE ROULER','/','/','Electrique ','D�placement de groupe �lectrog�ne  700kva','Aucune ','Electriciens','120','','',1),('10/6/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventive ','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/ ','','',NULL),('10/6/2026','14:00','M182','GROUPE ELECTROGENE /400kva ','ATELIER LE ROULER','/','/','Electrique ','Finition  d\'armoire de l\'inverseur  400kva (630a)','Aucune ','Electriciens','300','','',2),('10/7/2026','7:30','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','D�montage et nettoyage de v�rin + Serrage de tapis +R�glage des charbons ','Aucune ','Ouldhabchi +Maizi + Hatek','40','','',NULL),('10/7/2026','8:10','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','D�faut de charbons (changement des charbons)','Charbons','Ouldhabchi +Maizi + Hatek','60','','',NULL),('10/7/2026','10:00','M079','CROSS-LAPPER','ATELIER LAOUATE (LIGNE03)','HYPW-250*400','2307','M�canique ','R�paration des guides de tapis (Commande d\'un nouveau tapis)','Aucune ','Ouldhabchi +Maizi + Hatek','90','','',NULL),('10/7/2026','15:00','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','Instrumentation','D�faut de param�trage, centrage du v�hicule de la ligne','Aucune ','Mouhab + Abbed ','30','','',NULL),('10/7/2026','9:00','M182','GROUPE ELECTROGENE /400kva ','ATELIER LE ROULER','/','/','Electrique',' La mise en marche de groupe �lectrog�ne 400kva.','Aucune ','Electriciens','120','','',3),('10/7/2026','8:00','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Montage +Soudure','Suite des travaux d\'am�nagement de la niche de compresseur et les armoires �lectriques (en cours)','Toles TN 40 (Us�es)','Electriciens + Soudeur ','360','','',NULL),('10/7/2026','8:00','M015','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE','101','554','M�canique ','R�novation de  ligne de d�coupage de mousse','Aucune ','Oualid + Maizi + Abbed','480','','',NULL),('10/7/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventif','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/8/2026','6:00','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','D�blocage de v�rin de cross-lapper + le cardage','Aucune ','Ouldhabchi + Hatek','50','','',NULL),('10/8/2026','9:00','M111','CARDING MACHINE','ATELIER LAOUATE (LIGNE02)','YYGM-III-225','15/1231B','M�canique ','Cardage d�jaug� ','Aucune ','Ouldhabchi + Hatek','60','','',NULL),('10/8/2026','9:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','M�canique ','emontage de courroie de hoppener (main opener) ','Aucune ','Ouldhabchi + Hatek','60','','',NULL),('10/8/2026','9:00','M114','OVEN','ATELIER LAOUATE (LIGNE02)','/','/','M�canique ','remontage de la chaine de four','Aucune ','Ouldhabchi + Hatek','60','','',NULL),('10/8/2026','10:00','M089','CROSS-LAPPER','ATELIER LAOUATE (LIGNE04)','HYPW-250*400','2307','M�canique ','R�paration et remontage de la chaine de Mini-opener','Aucune ','Ouldhabchi + Hatek','45','','',NULL),('10/8/2026','11:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','M�canique ','Changement de courroie et r�glage de tendeur ','Courroie (22 x 1800)','Ouldhabchi + Hatek','60','','',NULL),('10/8/2026','9:00','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Montage +Soudure','Suite des travaux d\'am�nagement de la niche de compresseur et les armoires �lectriques (en cours)','Tire fonds 6.3 x 30mm (50pcs)',' Soudeur ','180','','',NULL),('10/8/2026','8:00','M015','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE','101','554','M�canique ','R�novation de  ligne de d�coupage de mousse','Chevilles m�taliques M12 * 140 (30pcs) + Vis M10 x 50mm (30pcs) +M�ches Acier N� 4/6/8.5/10.5 + 1 jeu de taraud N� 10+ 1jeu de taraud N� 12','Oualid (GIMO) + Maizi + Abbed','480','','',NULL),('10/8/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventif','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/9/2026','8:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','Pr�ventif','changement de palier FA206 du tapis et correction du fixation(taraudage).','Palier FA 206 ','Gouizi + Tarfa','12','','',NULL),('10/9/2026','10:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','Pr�ventif','changement de pignon ','Pignon (18 x 35 x 8)','Gouizi + Tarfa','60','','',NULL),('10/9/2026','10:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','Pr�ventif','changement de courroie ','Courroie (17 x 1375 B-54','Gouizi + Tarfa','60','','',NULL),('10/10/2026','6:00','M111','CARDING MACHINE','ATELIER LAOUATE (LIGNE02)','YYGM-III-225','15/1231B','M�canique ','Jauge de cardage','Aucune ','Hatek Laid','360','','',NULL),('10/10/2026','6:00','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','d�montage de cylindre (modification : supression de poulie et r�duction de courroie) d�blocage de Feeding','Aucune ','Hatek Laid','360','','',NULL),('10/10/2026','12:30','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','D�blocage de v�rin de cross-lapper','Aucune ','Hatek Laid','35','','',NULL),('10/10/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventif','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/11/2026','6:00','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','D�blocage des cylindres de feeder (d�montage des cylindres et d�blocage des roulements des paliers)+ r�glage et la jauge','Aucune ','Hatek Laid','330','','',NULL),('10/11/2026','12:30','M080','NEEDLE (4)','ATELIER LAOUATE (LIGNE03)','HYGZ','2307','M�canique ','Montage de v�rin pneumatique de Needle','Aucune ','Hatek Laid','30','','',NULL),('10/11/2026','8:00','M020','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','214','559','M�canique ','D�but de r�novation de  ligne de d�coupage de mousse (Carosselle N�06)','Aucune ','Oualid (GIMO) + Maizi + Stagiaire','480','','',NULL),('10/11/2026','8:30','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Montage +Soudure','Suite des travaux d\'am�nagement de la niche de compresseur et les armoires �lectriques (en cours)','Tire-fond + tole TN 40',' Soudeur ','240','','',NULL),('10/11/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventif','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/12/2026','6:00','M114','OVEN','ATELIER LAOUATE (LIGNE02)','/','/','M�canique ','R�glage de la chaine ','Aucune ','Hatek Laid + Ouldhabchi','240','','',NULL),('10/12/2026','6:00','M111','CARDING MACHINE','ATELIER LAOUATE (LIGNE02)','YYGM-III-225','15/1231B','M�canique ','r�glage de position de reducteur ','Aucune ','Hatek Laid + Ouldhabchi','','','',NULL),('10/12/2026','6:00','M113','DRAFTER','ATELIER LAOUATE (LIGNE02)','YYLQ-310','15/1231B','M�canique ','r�glage et la jauge des cylindres de dover','Aucune ','Hatek Laid + Ouldhabchi','','','',NULL),('10/12/2026','10:45','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','M�canique ','Montage de la pompe de polyole','Silicone Hot','Hatek Laid + Ouldhabchi','80','','',NULL),('10/12/2026','8:30','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Montage +Soudure','Atelier la Ouate (Exterieur cot� Zawra ligne 3 , nouveau compresseur +Armoires �lectrique ','Tire-fond + tole TN 40',' Soudeur ','360','','',NULL),('10/12/2026','10:30','M025','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE NV','BA-S 101','996','M�canique ','Changement de lame ','10450 x 15 x 0.6','Tarfa Khaled','30','','',NULL),('10/12/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventif','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/13/2026','14:00','M105','BROYEUR','ATELIER LAOUATE (LIGNE01)','/','/','M�canique ','Montage de moteur ','Aucune ','Ais + Korichi','30','','',NULL),('10/13/2026','15:00','M099','CARDING MACHINE','ATELIER LAOUATE (LIGNE01)','/','/','M�canique ','Montage de moteur de machine de bobinage ','Aucune ','Ais + Korichi','30','','',NULL),('10/13/2026','18:00','M084','FEEDING MACHINE','ATELIER LAOUATE (LIGNE04)','/','/','M�canique ','Montage de tapis ','Tapis PVC  2310 x 1211','Ais + Korichi','60','','',NULL),('10/13/2026','21:00','M084','FEEDING MACHINE','ATELIER LAOUATE (LIGNE04)','/','/','M�canique ','R�glage de cylindre ','Aucune ','Ais + Korichi','30','','',NULL),('10/13/2026','18:20','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','Remontage des cylindres de Feeder + d�bobinage de cylindre + jauge des cylindres','Cylindres','Hatek Laid ','30','','',NULL),('10/13/2026','10:45','M100','CROSS-LAPPER','ATELIER LAOUATE (LIGNE01)','M3200','','M�canique ','Changement de courroie de cylindre centrale','Courroie 7900 x 17','Hatek Laid ','40','','',NULL),('10/13/2026','8:00','M019','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','214','553','M�canique ','R�novation de  ligne de d�coupage de mousse (Machine carosselle N� 05)',' (500) Vis M6 x 15mm + (500) Boulons BTR M6 x 10mm + 5 M�ches 5.5 + 5 Silicone','Oualid (GIMO) + Maizi ','480','','',NULL),('10/13/2026','9:00','M192','GROUPE D\'EAU GLACE','ATELIER PRODUCTION DE MOUSSE','MC-SS65/RN1L','541L151720141170','Electrique','Changement de disjoncteur moteur 9-14amp (groupe d\'eau glasses)','Disjoncteur 9-14 Amp','Electriciens','30','','',NULL),('10/13/2026','10:00','M182','GROUPE ELECTROGENE /400kva ','ATELIER LE ROULER','/','/','Electrique','Installation d\'�clairage (zone de groupe �lectrog�ne 400kva)','Aucune ','Electriciens','120','','',4),('10/13/2026','12:00','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Electrique','Installation d\'�clairage (zone de nouveau compresseur )','Aucune ','Electriciens','120','','',NULL),('10/13/2026','15:00','M182','GROUPE ELECTROGENE /400kva ','ATELIER LE ROULER','/','/','Electrique','Retrait de 4 c�bles 1x240mm de l\'armoire inverseurs.','Aucune ','Electriciens','60','','',5),('10/13/2026','/','M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','HBZ-80T/30KW','/','Pr�ventif','V�rification machine presse recyclage plastique ','Aucune ','Gouizi + Tarfa','/','','',NULL),('10/13/2026','7:00','M151','CONVOYEUR 21','ATELIER LE ROULER','M-210A','40671','Pneumatique ','R�glage tapis convoyeur probl�me pneumatique ','Aucune ','Gouizi + Tarfa','60','','',6),('10/13/2026','8:00','M122','MACHINE SURGET','ATELIER LE ROULER','M1100','40844','Pneumatique ','R�glage et r�paration tapis convoyeur machine couture n 08 probl�me joint spi de v�rin pneumatique (d�montage et remontage v�rin )','Aucune ','Gouizi + Tarfa','','','',7),('10/13/2026','10:30','M117','LA PRESSE AUTOMATIQUE','ATELIER LE ROULER','/','/','Instrumentation','R�glage rouleuse  presse automatique probl�me instrumentation ','Aucune ','Gouizi + Tarfa','60','','',8),('10/13/2026','13:15','M118','MACHINE SURGET','ATELIER LE ROULER','M1100','40841','M�canique ','R�glage de support de bras de file de la machine � coudre N�  01','Aucune ','Gouizi + Tarfa','35','','',9),('10/14/2026','6:05','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','Bobinage d\'une partie de cylindre de feeder','Fil de bobinage ','Ouldhabchi + Hatek','330','','',NULL),('','','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','','d�blocage de cylindre de main-opener','','','','','',NULL),('10/14/2026','13:00','M099','CARDING MACHINE','ATELIER LAOUATE (LIGNE01)','/','/','M�canique ','D�blocage de cylindre + serrage des courroies','Aucune ','Ouldhabchi + Hatek','30','','',NULL),('10/14/2026','8:00','M020','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','214','559','M�canique ','R�novation de  ligne de d�coupage de mousse (Machine carosselle N� 05) suite','Aucune ','Oualid (GIMO) + Maizi ','480','','',NULL),('10/14/2026','8:00','M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','MULTIMAX PRO','563','Electricit�','Intervention �lectrique sur la pompe TDI (disjoncteur motor a chang�)','Aucune ','Electriciens','30','','',NULL),('10/14/2026','13:00','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Electricit�','test de mise en marche de compresseur N� 02.','Aucune ','Electricien','30','','',NULL),('10/14/2026','19:30','M079','CROSS-LAPPER','ATELIER LAOUATE (LIGNE03)','HYPW-250*400','2307','M�canique ','Remplacement de tapis pvc de cross-lapper','Tapis PVC  7150 x 2500','Ais + Korichi','90','','',NULL),('10/14/2026','8:00','M117','LA PRESSE AUTOMATIQUE','ATELIER LE ROULER','/','/','Pneumatique ','R�glage machine presse automatique (Probl�me: elle ne presse les matelas � deux place. avec zaki hllali et mourad naili','Aucune ','Gouizi + Tarfa +Zaki +Naili mourad','120','','',10),('10/15/2026','6:00','M099','CARDING MACHINE','ATELIER LAOUATE (LIGNE01)','/','/','M�canique ','D�blocage de cardage ','Aucune ','Hatek + Ouldhabchi','20','','',NULL),('10/15/2026','','M098','FEEDING MACHINE','ATELIER LAOUATE (LIGNE01)','/','/','','et la jauge de feeder)','Aucune ','','','','',NULL),('10/15/2026','7:30','M111','CARDING MACHINE','ATELIER LAOUATE (LIGNE02)','YYGM-III-225','15/1231B','M�canique ','Montage de courroie ','Courroie 7900 x 17','Hatek + Ouldhabchi','25','','',NULL),('10/15/2026','10:30','M079','CROSS-LAPPER','ATELIER LAOUATE (LIGNE03)','HYPW-250*400','2307','M�canique ','Serrage des paliers de tapis de cross-lapper et ajustement du tendeur','Aucune ','Hatek + Ouldhabchi','45','','',NULL),('10/15/2026','12:00','M084','FEEDING MACHINE','ATELIER LAOUATE (LIGNE04)','/','/','M�canique ','Montage accessoires de feeder ','Aucune ','Hatek + Ouldhabchi','30','','',NULL),('10/15/2026','','M086','FINE OPENER','ATELIER LAOUATE (LIGNE04)','HYKS','2401','','et la chaine de main-opener','','','','','',NULL),('10/15/2026','8:00','M020','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','214','559','M�canique ','R�novation de  ligne de d�coupage de mousse (Machine carosselle N� 05) suite','Aucune ','Oualid (GIMO) + Maizi ','480','','',NULL),('10/15/2026','7:30','M117','LA PRESSE AUTOMATIQUE','ATELIER LE ROULER','/','/','Pr�ventif',' maintenance pr�ventive machine presse automatique et nettoyage de la pompe  hydraulique','Aucune ','Gouizi + Tarfa','240','','',11),('10/16/2026','8:00','M109','MAIN OPENER','ATELIER LAOUATE (LIGNE02)','YYKB-111-150','15/1231B','M�canique ','Changement de tapis pvc de Main-opener ','Tapis PVC 2970 x 2120','Ais + Ouldhabchi ','480','','',NULL),('10/16/2026','8:00','M110','FEEDER','ATELIER LAOUATE (LIGNE02)','YYGM-111-225','15/1231B','M�canique ','Rebobinage de 1 m�tre de cylindre ','Fil de bobinage + 2 baguettes','Hatek + Tarfa','480','','',NULL),('10/16/2026','8:00','M126','LA PRESSE MANUEL 01','ATELIER LE ROULER','','','M�canique ','Montage de v�rin ','V�rin ','Gouizi + Mouhab','480','','',12),('10/17/2026','7:10','M106','BALANCE (4 porte)','ATELIER LAOUATE (LIGNE02)','YYKB-111-160','15/1231B','M�canique ','','Aucune ','Hatek + Ouldhabchi','25','','',NULL),('10/17/2026','','M105','BROYEUR','ATELIER LAOUATE (LIGNE01)','/','/','','Montage de moteur de r�ducteur de broyeur ','','','','','',NULL),('10/17/2026','9:30','M112','CROSS-LAPPER','ATELIER LAOUATE (LIGNE02)','HYPW-250*400','15/1231B','M�canique ','D�montage de r�ducteur et remplacement par le r�ducteur de la ligne 4 + remplacement de roulement ','roulement 6209 2 RS','Hatek + Ouldhabchi','420','','',NULL),('10/17/2026','13:00','M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','75APM','25090265','Electrique ','Installation 2eme bouton d\'arr�t d\'urgence pour compresseur 02.','Bouton d\'urgence','Electriciens','30','','',NULL),('10/17/2026','8:00','M020','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','214','559','M�canique ','R�novation de  ligne de d�coupage de mousse (Machine carosselle N� 05) suite','Rondelles dia 20 x 35mm (10pcs) Silicone Noir (5 tubes)','Oualid (GIMO) + Maizi ','480','','',NULL),('10/17/2026','8:30','M027','CARDING MACHINE','ATELIER DE COUTURE','/','/','Electrique ','R�glage machine cardage probl�me �lectrique atelier femme ','Aucune ','Gouizi + Tarfa','60','','',NULL),('10/17/2026','11:00','M117','LA PRESSE AUTOMATIQUE','ATELIER LE ROULER','/','/','Instrumentation +M�canique ','R�glage machine presse automatique probl�me instrumentation et r�glage les cylindre rouleuse probl�me mecanique ','Aucune ','Gouizi + Tarfa','60','','',13),('10/17/2026','13:00','M117','LA PRESSE AUTOMATIQUE','ATELIER LE ROULER','/','/','Pr�ventif','Press automatique surveillance et modification des param�tres sp�cifiques au nylon','Aucune ','Gouizi + Tarfa','60','','',14),('10/18/2026','7:30','M011','FIBRE CARDING MACHINERY-AV-800','ATELIER CARDINAGE','1M','AV90S-5','M�canique ','D�montage des cylindres pour r�vision','Aucune ','Hatek + Ouldhabchi','90','','',NULL),('10/18/2026','9:30','M111','CARDING MACHINE','ATELIER LAOUATE (LIGNE02)','YYGM-III-225','15/1231B','M�canique ','Changement de courroie + Jauge des cylindres ','Courroie 7900 x 17','Hatek + Ouldhabchi','180','','',NULL),('10/18/2026','8:00','M020','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','214','559','M�canique ','R�novation de  ligne de d�coupage de mousse (Machine carosselle N� 06) suite','20 Chevilles m�talliques M10 x 20mm + Roue de carosselle + 2 boulons M10 x 80mm + 2 roues Dia 80','Oualid (GIMO) + Maizi ','480','','',NULL);
/*!40000 ALTER TABLE `interventions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `machine_technical_manuals`
--

LOCK TABLES `machine_technical_manuals` WRITE;
/*!40000 ALTER TABLE `machine_technical_manuals` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_technical_manuals` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `machines`
--

LOCK TABLES `machines` WRITE;
/*!40000 ALTER TABLE `machines` DISABLE KEYS */;
INSERT INTO `machines` VALUES (1,'M001','LIGNE DE PRODUCTION DE LA MOUSSE','ATELIER PRODUCTION DE MOUSSE','LAADER BERG','MULTIMAX PRO','563',1,'MACHINE',NULL,NULL,'broken',NULL,NULL,NULL,1,NULL,'LIGNE DE PRODUCTION DE LA MOUSSE','LIGNE DE PRODUCTION DE LA MOUSSE',NULL,NULL,NULL,NULL,NULL,NULL),(2,'M002','ONDULEUR POUR LAADER BERG','ATELIER PRODUCTION DE MOUSSE','RIELLO UPS','UPS S3T 30 XTD A0','AC16UT832240003',2,'MACHINE',NULL,NULL,'broken',NULL,NULL,NULL,1,NULL,'ONDULEUR POUR LAADER BERG','ONDULEUR POUR LAADER BERG',NULL,NULL,NULL,NULL,NULL,NULL),(3,'M060','GRAND BALANCE','ATELIER DE COUTURE','2M-INDUSTRIES','/','',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,'M003','LAME COUPEUSE','ATELIER PRODUCTION DE MOUSSE','BAUMER','ABLG-1','100/0080',3,'MACHINE','2025','EN MARCHE','EN MARCHE',0,NULL,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,'M004','ONDULEUR POUR BAUMER','ATELIER PRODUCTION DE MOUSSE','legrand','BP 30076','2508P1182001',4,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,'M005','MACHINE NOUEUSE DE RESSORT','ATELIER CARCASSE','UMIT MAKINA','PC-20','16014',NULL,'MACHINE','2017','EN PANNE','EN MARCHE',0,NULL,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(7,'M061','COUPEUSSE','ATELIER DE COUTURE','SIMTEX','/','23080634',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(8,'M062','COUPEUSSE','ATELIER DE COUTURE','SIMARU','/','2307L1N560',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,'M006','POCKET SPRING COLING MACHINE','ATELIER CARCASSE','UMIT MAKINA','PC-50','15319',NULL,'MACHINE','2017','EN PANNE','EN MARCHE',0,NULL,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(10,'M007','MACHINE PRESSE MATELAT','ATELIER CARCASSE','ACMA','/','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,NULL,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(11,'M063','MINI COUPEUSSE','ATELIER DE COUTURE','YOKE','YK-100A','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(12,'M008','HEMMING MACHINE','ATELIER CARCASSE','MECA','HA-96C/A-3','00351',NULL,'MACHINE','2007','EN PANNE','EN MARCHE',0,NULL,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(13,'M009','SOUFFLEUR','ATELIER CARCASSE','','','',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,NULL,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(14,'M064','CARDING MACHINE','ATELIER DE COUTURE','MAPS','/','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,NULL,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(15,'M065','MACHINE SURGET','ATELIER DE COUTURE','HLD-5C','/','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,4,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(16,'M066','MACHINE BORDEUSSE','ATELIER DE COUTURE','MAUSER','/','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,5,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(17,'M010','CARDING MACHINE','ATELIER CARCASSE','','','',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,NULL,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(18,'M011','FIBRE CARDING MACHINERY-AV-800','ATELIER CARDINAGE','MAPS','1M','AV90S-5',1,'MACHINE','','EN MARCHE','EN MARCHE',1,NULL,'',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(19,'M012','AV-90S FIBER FEEDER CARDING','ATELIER CARDINAGE','MAPS','1,1M','AV90S-6',2,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(20,'M013','FIBRE CARDING MACHINERY-AV-900 D10N°','ATELIER CARDINAGE','MAPS','1,1M','AV90S-7',3,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(21,'M014','LA PRESSE OREILLER','ATELIER DE COUTURE FEMMES','SNS CYLINDER','QGB 125*300','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(22,'M067','MACHINE BORDEUSSE','ATELIER DE COUTURE','PRECIOUS','PC335A','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,2,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(23,'M068','MACHINE BORDEUSSE','ATELIER DE COUTURE','TYPICAL','GC2603','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(24,'M015','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE','GIMO','101','554',1,'MACHINE','05/2015','EN MARCHE','EN MARCHE',2,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(25,'M016','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE','GIMO','101','538',2,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(26,'M017','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE','GIMO','101','570',3,'MACHINE','','EN PANNE','EN MARCHE',0,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(27,'M018','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','GIMO','214','534',4,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(28,'M019','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','GIMO','214','553',5,'MACHINE','','EN MARCHE','EN MARCHE',1,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(29,'M020','MACHINE CAROSSEL','ATELIER DE DECOUPAGE','GIMO','214','559',6,'MACHINE','','EN MARCHE','EN MARCHE',5,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(30,'M174','BALANCE ','ATELIER LAOUATE','2M-INDUSTRIES ','/','0407124',NULL,'EQUIPEMENT ','7/16/1905','EN MARCHE ','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(31,'M021','MACHINE COUDOIRE','ATELIER DE DECOUPAGE','SUNKIST','SA-144K','',7,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(32,'M022','MACHINE ROULEUSSE','ATELIER DE DECOUPAGE','GIMO','BA-S109','FT53',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(33,'M023','MACHINE BROYEUR','ATELIER DE DECOUPAGE','GIMO','403','563',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(34,'M024','MACHINE CAROSSEL','ATELIER DE DECOUPAGE NV','GIMO','BA-S 214','987',10,'MACHINE','2/1/2026','EN MARCHE','EN MARCHE',0,NULL,'',6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(35,'M069','MACHINE HONG WU CHUANG JU JIXIE','ATELIER DE COUTURE','/','/','',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(36,'M025','MACHINE SCIE VERTICALE','ATELIER DE DECOUPAGE NV','GIMO','BA-S 101','996',11,'MACHINE','2/2/2026','EN MARCHE','EN MARCHE',1,NULL,'',6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(37,'M026','SOUFLEUSSE','ATELIER DE COUTURE','/','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(38,'M027','CARDING MACHINE','ATELIER DE COUTURE','/','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',1,NULL,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(39,'M028','BALANCE','ATELIER DE COUTURE','/','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,2,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(40,'M029','SOUDEUSSE','ATELIER DE COUTURE','/','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(41,'M030','COUPEUSSE','ATELIER DE COUTURE','SGGEMSY','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(42,'M031','COUPEUSSE','ATELIER DE COUTURE','','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,3,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(43,'M032','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','PRECIOUS','','00418056255',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(44,'M033','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','GEM7-28','','041170686',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(45,'M034','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','JACK','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(46,'M070','BALANCE','ATELIER LAOUATE','HOAGE','/','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(47,'M071','DOT COATING MACHINE','ATELIER LAOUATE','','CQ_3400*12L','',NULL,'MACHINE','','','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(48,'M035','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','PRECIOUS','G18D','',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,2,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(49,'M072','BROYEUR','ATELIER LAOUATE','EDGE TRIM OPENER','/','/',NULL,'MACHINE','','','EN MARCHE',0,1,'',8,3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(50,'M036','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','GEMSY','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(51,'M073','BALANCE (3 porte)','ATELIER LAOUATE','HOAGE','HYKB-120','2307',1,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'BALANCE (3 porte)','BALANCE (3 porte)',NULL,NULL,NULL,NULL,NULL,NULL),(52,'M037','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','SGGEMSY','SG8802E-B','ZK 128413276',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(53,'M038','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','JACK','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(54,'M039','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','PRECIOUS','PC9893D','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(55,'M040','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','PRECIOUS','PC9893D','00418067549',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(56,'M041','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','ZOJE','ZJ9513-17G/02','38RA00092',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(57,'M074','PRE OPENER','ATELIER LAOUATE','HOAGE','HYYK-130','2307',2,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'PRE OPENER','PRE OPENER',NULL,NULL,NULL,NULL,NULL,NULL),(58,'M042','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','PRECIOUS','G18D','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'LA CARTE MERE',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(59,'M075','BIG BLANDER','ATELIER LAOUATE','HOAGE','HYDC-170','2307',3,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'BIG BLANDER','BIG BLANDER',NULL,NULL,NULL,NULL,NULL,NULL),(60,'M043','MACHINE DROIT A COUDRE','ATELIER DE COUTURE','GEM7','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(61,'M175','BALANCE ','ATELIER LAOUATE','2M-INDUSTRIES ','/','0407024',NULL,'EQUIPEMENT ','7/16/1905','EN MARCHE ','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(62,'M076','FINE OPENER','ATELIER LAOUATE','HOAGE','HYKS-130','2307',4,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'FINE OPENER','FINE OPENER',NULL,NULL,NULL,NULL,NULL,NULL),(63,'M077','FEEDER (2 PARALLELE)','ATELIER LAOUATE','HOAGE','HYGM-210','2401',5,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'FEEDER (2 PARALLELE)','FEEDER (2 PARALLELE)',NULL,NULL,NULL,NULL,NULL,NULL),(64,'M078','CARDING MACHINE','ATELIER LAOUATE','HOAGE','HYSL-230','2307',6,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'CARDING MACHINE','CARDING MACHINE',NULL,NULL,NULL,NULL,NULL,NULL),(65,'M044','MACHINE SURGET','ATELIER DE COUTURE','PERCIOUS','PC757','01015118078',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(66,'M176','BALANCE ','ATELIER CARDINAGE','/','/','/',NULL,'EQUIPEMENT ','/','EN MARCHE ','EN MARCHE',0,1,'',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(67,'M079','CROSS-LAPPER','ATELIER LAOUATE','HOAGE','HYPW-250*400','2307',7,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'CROSS-LAPPER','CROSS-LAPPER',NULL,NULL,NULL,NULL,NULL,NULL),(68,'M177','COMPRESSEUR  DAIR  ','ATELIER DE DECOUPAGE','/','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(69,'M045','MACHINE SURGET','ATELIER DE COUTURE','JACK','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(70,'M046','MACHINE SURGET','ATELIER DE COUTURE','JACK','JK-850','150783856',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(71,'M047','MACHINE SURGET','ATELIER DE COUTURE','JACK','JK-850D','160673425',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(72,'M048','MACHINE SURGET','ATELIER DE COUTURE','PRECIOUS','PC757','0101801018037596',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(73,'M049','MACHINE SURGET','ATELIER DE COUTURE','BROTHER','MA4-B551','065-5',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'PLISIEUR PRBLM',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(74,'M080','NEEDLE (4)','ATELIER LAOUATE','HOAGE','HYGZ','2307',8,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'NEEDLE (4)','NEEDLE (4)',NULL,NULL,NULL,NULL,NULL,NULL),(75,'M081','ROULEUSSE','ATELIER LAOUATE','HOAGE','HYTG','2307',9,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'ROULEUSSE','ROULEUSSE',NULL,NULL,NULL,NULL,NULL,NULL),(76,'M082','WINDER AND CUTTER','ATELIER LAOUATE','HOAGE','HYXT','2307',10,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,3,'WINDER AND CUTTER','WINDER AND CUTTER',NULL,NULL,NULL,NULL,NULL,NULL),(77,'M050','MACHINE SURGET COUETTE','ATELIER DE COUTURE','ZOJE','ZJ-750W','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(78,'M083','BALANCE (3 porte)','ATELIER LAOUATE','HOAGE','HYKB-120','2401',1,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'BALANCE (3 porte)','BALANCE (3 porte)',NULL,NULL,NULL,NULL,NULL,NULL),(79,'M051','MACHINE SURGET COUETTE','ATELIER DE COUTURE','ZOJE','ZJ-750W','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(80,'M052','MACHINE SURGET COUETTE','ATELIER DE COUTURE','ZOJE','ZJ-750W','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(81,'M053','MACHINE SURGET COUETTE','ATELIER DE COUTURE','ZOJE','ZJ-750W','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(82,'M054','MACHINE BORDEUSE COUETTE','ATELIER DE COUTURE','MAUSER','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(83,'M084','FEEDING MACHINE','ATELIER LAOUATE','HOAGE','/','/',2,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'FEEDING MACHINE','FEEDING MACHINE',NULL,NULL,NULL,NULL,NULL,NULL),(84,'M085','BIG BLANDER','ATELIER LAOUATE','HOAGE','HYDC-170','2401',3,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'BIG BLANDER','BIG BLANDER',NULL,NULL,NULL,NULL,NULL,NULL),(85,'M086','FINE OPENER','ATELIER LAOUATE','HOAGE','HYKS','2401',4,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'FINE OPENER','FINE OPENER',NULL,NULL,NULL,NULL,NULL,NULL),(86,'M087','VIBRATING FEEDER','ATELIER LAOUATE','HOAGE','HYGM-210','2307',5,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'VIBRATING FEEDER','VIBRATING FEEDER',NULL,NULL,NULL,NULL,NULL,NULL),(87,'M055','MACHINE BORDEUSE COUETTE','ATELIER DE COUTURE','PRECIOUS','PC335A','01217047881',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(88,'M088','CARDING MACHINE','ATELIER LAOUATE','HOAGE','HYSL-230','2401',6,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'CARDING MACHINE','CARDING MACHINE',NULL,NULL,NULL,NULL,NULL,NULL),(89,'M056','FER A REPASSER','ATELIER DE COUTURE','OROCMS','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(90,'M178','GROUPE ELECTROGENE','ATELIER DE DECOUPAGE','POWER','ED0400','20151686',NULL,'EQUIPEMENT ','07.2015','EN MARCHE ','EN MARCHE',0,1,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(91,'M057','MACHINE DE BANDE','ATELIER DE COUTURE','YOULIAN','YX-M-01','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(92,'M058','WB-4ATAPPE EDGE MACHINE','ATELIER DE COUTURE','HW-300V','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(93,'M059','GRAND BALANCE','ATELIER DE COUTURE','LP7510A','/','160531021',NULL,'MACHINE','','EN PANNE','EN MARCHE',0,1,'',7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(94,'M179','COMPRESSEUE DAIR ','ATELIER DE DECOUPAGE','SCREW AIR COMPRESSOR','75APM','25090264',NULL,'EQUIPEMENT ','2026.01','EN MARCHE ','EN MARCHE',0,1,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(95,'M180','SECHEUR ','ATELIER DE DECOUPAGE','Refrigerated compresses air dryer','P-75AC','/',NULL,'EQUIPEMENT ','2026.01','EN MARCHE ','EN MARCHE',0,1,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(96,'M089','CROSS-LAPPER','ATELIER LAOUATE','HOAGE','HYPW-250*400','2307',7,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'CROSS-LAPPER','CROSS-LAPPER',NULL,NULL,NULL,NULL,NULL,NULL),(97,'M090','NEEDLE 1','ATELIER LAOUATE','YING YONG','YYZS-340','15/1231B',8,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'NEEDLE 1','NEEDLE 1',NULL,NULL,NULL,NULL,NULL,NULL),(98,'M091','NEEDLE 2','ATELIER LAOUATE','YING YONG','YYZS-320','15/1231B',8,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'NEEDLE 2','NEEDLE 2',NULL,NULL,NULL,NULL,NULL,NULL),(99,'M181','BALAN D\'AIR ','ATELIER DE DECOUPAGE','Air Tank','/','R18065039',NULL,'EQUIPEMENT ','7/14/1905','EN MARCHE ','EN MARCHE',0,1,'',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(100,'M092','NEEDLE 3','ATELIER LAOUATE','YING YONG','YYZS-320','15/1231B',8,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'NEEDLE 3','NEEDLE 3',NULL,NULL,NULL,NULL,NULL,NULL),(101,'M182','GROUPE ELECTROGENE /400kva ','ATELIER LE ROULER','GMI','/','/',NULL,'EQUIPEMENT ','/','EN MARCHE ','EN MARCHE',4,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(102,'M093','ROULEUSSE','ATELIER LAOUATE','YING YONG','/','/',9,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'ROULEUSSE','ROULEUSSE',NULL,NULL,NULL,NULL,NULL,NULL),(103,'M094','WINDER AND CUTTER','ATELIER LAOUATE','YING YONG','YYXT-320','15/1231B',10,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,4,'WINDER AND CUTTER','WINDER AND CUTTER',NULL,NULL,NULL,NULL,NULL,NULL),(104,'M095','BALANCE (3 porte)','ATELIER LAOUATE','HOAGE','M1200','',1,'MACHINE','','EN MARCHE','EN MARCHE',1,1,'',8,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(105,'M096','PRE OPENER','ATELIER LAOUATE','HOAGE','YYKS-III-150','/',2,'MACHINE','','EN MARCHE','EN MARCHE',1,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(106,'M097','BIG BLANDER','ATELIER LAOUATE','HOAGE','/','/',3,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(107,'M098','FEEDING MACHINE','ATELIER LAOUATE','HOAGE','/','/',4,'MACHINE','','EN MARCHE','EN MARCHE',1,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(108,'M099','CARDING MACHINE','ATELIER LAOUATE','HOAGE','/','/',5,'MACHINE','','EN MARCHE','EN MARCHE',5,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(109,'M100','CROSS-LAPPER','ATELIER LAOUATE','HOAGE','M3200','',6,'MACHINE','','EN MARCHE','EN MARCHE',9,1,'',8,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(110,'M101','DRAFTER','ATELIER LAOUATE','YING YANG','/','/',7,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,1,'DRAFTER','DRAFTER',NULL,NULL,NULL,NULL,NULL,NULL),(111,'M102','OVEN','ATELIER LAOUATE','HOAGE','3200×10000','/',8,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,1,'OVEN','OVEN',NULL,NULL,NULL,NULL,NULL,NULL),(112,'M103','WINDER AND CUTTER','ATELIER LAOUATE','HOAGE','/','/',9,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,1,'WINDER AND CUTTER','WINDER AND CUTTER',NULL,NULL,NULL,NULL,NULL,NULL),(113,'M104','LA PRESSE','ATELIER LAOUATE','/','/','/',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',8,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(114,'M105','BROYEUR','ATELIER LAOUATE','HOAGE','/','/',NULL,'MACHINE','','EN PANNE','EN MARCHE',2,1,'',8,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(115,'M106','BALANCE (4 porte)','ATELIER LAOUATE','HOAGE','YYKB-111-160','15/1231B',1,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'BALANCE (4 porte)','BALANCE (4 porte)',NULL,NULL,NULL,NULL,NULL,NULL),(116,'M107','PRE OPENER','ATELIER LAOUATE','HOAGE','YYKB-111-150','15/1231B',2,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'PRE OPENER','PRE OPENER',NULL,NULL,NULL,NULL,NULL,NULL),(117,'M108','BIG BLANDER','ATELIER LAOUATE','HOAGE','/','/',3,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'BIG BLANDER','BIG BLANDER',NULL,NULL,NULL,NULL,NULL,NULL),(118,'M109','MAIN OPENER','ATELIER LAOUATE','HOAGE','YYKB-111-150','15/1231B',4,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'MAIN OPENER','MAIN OPENER',NULL,NULL,NULL,NULL,NULL,NULL),(119,'M110','FEEDER','ATELIER LAOUATE','HOAGE','YYGM-111-225','15/1231B',5,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'FEEDER','FEEDER',NULL,NULL,NULL,NULL,NULL,NULL),(120,'M111','CARDING MACHINE','ATELIER LAOUATE','HOAGE','YYGM-III-225','15/1231B',6,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'CARDING MACHINE','CARDING MACHINE',NULL,NULL,NULL,NULL,NULL,NULL),(121,'M112','CROSS-LAPPER','ATELIER LAOUATE','HOAGE','HYPW-250*400','15/1231B',7,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'CROSS-LAPPER','CROSS-LAPPER',NULL,NULL,NULL,NULL,NULL,NULL),(122,'M113','DRAFTER','ATELIER LAOUATE','YING YANG','YYLQ-310','15/1231B',8,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'DRAFTER','DRAFTER',NULL,NULL,NULL,NULL,NULL,NULL),(123,'M114','OVEN','ATELIER LAOUATE','HOAGE','/','/',9,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'OVEN','OVEN',NULL,NULL,NULL,NULL,NULL,NULL),(124,'M115','WINDER AND CUTTER','ATELIER LAOUATE','HOAGE','YYXT-310','15/1231B',10,'MACHINE',NULL,NULL,'working',NULL,NULL,NULL,8,2,'WINDER AND CUTTER','WINDER AND CUTTER',NULL,NULL,NULL,NULL,NULL,NULL),(125,'M183','COMPRESSEUE DAIR ','ATELIER LE ROULER','Screw Air Compressor ','/','24073226',NULL,'EQUIPEMENT ','2024.08','HORS SERVICE ','EN MARCHE',0,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(126,'M116','LA PRESSE','ATELIER LAOUATE','','/','/',NULL,'MACHINE','','','EN MARCHE',0,1,'',8,2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(127,'M117','LA PRESSE AUTOMATIQUE','ATELIER LE ROULER','MERT MAKINA','/','/',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',5,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(128,'M118','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40841',1,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',1,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(129,'M119','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40846',2,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(130,'M120','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40843',3,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(131,'M121','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40434',4,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(132,'M122','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40844',5,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',1,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(133,'M123','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40845',6,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(134,'M124','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40842',7,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(135,'M125','MACHINE SURGET','ATELIER LE ROULER','MERT MAKINA','M1100','40664',8,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(136,'M126','LA PRESSE MANUEL 01','ATELIER LE ROULER','','','',1,'MACHINE','2018','EN MARCHE','EN MARCHE',1,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(137,'M127','LA PRESSE MANUEL','ATELIER LE ROULER','ITALPRESSE SPA','SCF/6','1200',2,'MACHINE','2019','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(138,'M128','LA PRESSE MANUEL','ATELIER LE ROULER','HERCULE','/','/',3,'MACHINE','','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(139,'M129','LA PRESSE SEMI AUTOMATIQUE','ATELIER LE ROULER','MERT MAKINA','M2100','40066',NULL,'LIGNE DE PRODUCTION','2018','EN PANNE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(140,'M130','ROULEUSSE','ATELIER LE ROULER','','HT-RPM','/',NULL,'LIGNE DE PRODUCTION','','A L\'ARRET','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(141,'M131','CONVOYEUR 01','ATELIER LE ROULER','MERT MAKINA','M-210A','40685',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(142,'M132','CONVOYEUR 02','ATELIER LE ROULER','MERT MAKINA','M-210F','40647',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(143,'M133','CONVOYEUR 03','ATELIER LE ROULER','MERT MAKINA','M-210A','40686',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(144,'M134','CONVOYEUR 04','ATELIER LE ROULER','MERT MAKINA','M-210A','40685',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(145,'M135','CONVOYEUR 05','ATELIER LE ROULER','MERT MAKINA','M-210A','40698',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(146,'M136','CONVOYEUR 06','ATELIER LE ROULER','MERT MAKINA','M-210A','40697',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(147,'M137','CONVOYEUR 07','ATELIER LE ROULER','MERT MAKINA','M-210F','40695',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(148,'M138','CONVOYEUR 08','ATELIER LE ROULER','MERT MAKINA','M-210P','40648',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(149,'M139','CONVOYEUR 09','ATELIER LE ROULER','MERT MAKINA','M-210A','40679',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(150,'M140','CONVOYEUR 10','ATELIER LE ROULER','MERT MAKINA','M-210A','40679',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(151,'M141','CONVOYEUR 11','ATELIER LE ROULER','MERT MAKINA','M-210A','40668',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(152,'M142','CONVOYEUR 12','ATELIER LE ROULER','MERT MAKINA','M-210Q','40649',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(153,'M143','CONVOYEUR 13','ATELIER LE ROULER','MERT MAKINA','M-210A','40733',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(154,'M144','CONVOYEUR 14','ATELIER LE ROULER','MERT MAKINA','M-210A','40646',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(155,'M145','CONVOYEUR 15','ATELIER LE ROULER','MERT MAKINA','M-210A','40682',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(156,'M146','CONVOYEUR 16','ATELIER LE ROULER','MERT MAKINA','M-210A','40683',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(157,'M147','CONVOYEUR 17','ATELIER LE ROULER','MERT MAKINA','M-210A','40669',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(158,'M148','CONVOYEUR 18','ATELIER LE ROULER','MERT MAKINA','M-210A','40680',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(159,'M149','CONVOYEUR 19','ATELIER LE ROULER','MERT MAKINA','M-210A','40677',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(160,'M150','CONVOYEUR 20','ATELIER LE ROULER','MERT MAKINA','M-210A','40676',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(161,'M151','CONVOYEUR 21','ATELIER LE ROULER','MERT MAKINA','M-210A','40671',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',1,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(162,'M152','CONVOYEUR 22','ATELIER LE ROULER','MERT MAKINA','M-210A','40681',NULL,'LIGNE DE PRODUCTION','2018','EN MARCHE','EN MARCHE',0,NULL,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(163,'M153','MACHINE OUATINAGE 01 SANS SURGET','ATELIER OUATINAGE','MERT MAKINA','M1400','42666',1,'MACHINE','2/1/2025','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(164,'M154','MACHINE 01 DE COUPE','ATELIER OUATINAGE','MERT MAKINA','M-5000','42668',1,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(165,'M155','MACHINE OUATINAGE 02 AVEC SURGET','ATELIER OUATINAGE','MERT MAKINA','M1400','42665',2,'MACHINE','2/2/2025','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(166,'M156','MACHINE 02 DE COUPE','ATELIER OUATINAGE','MERT MAKINA','M-7500','42664',2,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(167,'M157','MACHINE OUATINAGE 03 AVEC SURGET','ATELIER OUATINAGE','MERT MAKINA','M1400','42667',3,'MACHINE','2/3/2025','','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(168,'M158','MACHINE 03 DE COUPE','ATELIER OUATINAGE','MERT MAKINA','M-7500','42663',3,'MACHINE','','','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(169,'M159','MACHINE OUATINAGE 04 SANS SURGET','ATELIER OUATINAGE','MERT MAKINA','M1200','40065',4,'MACHINE','11/1/2016','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(170,'M160','MACHINE 04 DE COUPE','ATELIER OUATINAGE','MERT MAKINA','M-5000','40064',4,'MACHINE','','','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(171,'M161','MACHINE OUATINAGE 05 SANS SURGET','ATELIER OUATINAGE','MERT MAKINA','M1200','40219',5,'MACHINE','11/2/2016','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(172,'M162','MACHINE 05 DE COUPE','ATELIER OUATINAGE','MERT MAKINA','M-5000','40212',5,'MACHINE','','','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(173,'M163','MACHINE OUATINAGE 06','ATELIER OUATINAGE','CHINE','/','/',6,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(174,'M164','MACHINE OUATINAGE 07 SANS SURGET','ATELIER OUATINAGE','MERT MAKINA','M1200','40222',7,'MACHINE','11/2/2016','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(175,'M165','MACHINE OUATINAGE 08','ATELIER OUATINAGE','HLD-4WD','/','/',8,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(176,'M166','MACHINE OUATINAGE 09','ATELIER OUATINAGE','HC 2500','/','/',9,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(177,'M167','LAMINATION MACHINE','ATELIER OUATINAGE','CMA','/','PUR-2600',NULL,'MACHINE','','EN MARCHE','EN MARCHE',0,1,'',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(178,'M168','LA PRESSE DE RECYCLAGE','ATELIER RECYCLAGE','','HBZ-80T/30KW','/',NULL,'MACHINE','10/11/2018','','EN MARCHE',12,NULL,'',11,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(179,'M169','CONVOYEUR','ATELIER RECYCLAGE','','/','/',NULL,'MACHINE','','','EN MARCHE',0,NULL,'',11,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(180,'M170','COMPRESSEUR  DAIR  ','ATELIER LAOUATE','POWER SYSTEM','PASCAL 15-10/500 DF (IE3)','6559000004',NULL,'EQUIPEMENT ','7/16/1905','EN MARCHE ','EN MARCHE',1,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(181,'M171','SECHEUR ','ATELIER LAOUATE','Frozen type compressed air drying machine','ZL-3GW','31110846',NULL,'EQUIPEMENT ','2024.03.05ZL','EN MARCHE ','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(182,'M184','BALAN D\'AIR ','ATELIER LE ROULER','Air Tank','/','LD220704A1-0156',NULL,'EQUIPEMENT ','7/18/1905','HORS SERVICE ','EN MARCHE',0,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(183,'M172','COMPRESSEUR  DAIR  NV','ATELIER LAOUATE','SCREW AIR COMPRESSOR','75APM','25090265',NULL,'EQUIPEMENT ','2026.01','EN ATN','EN MARCHE',8,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(184,'M173','SECHEUR  NV','ATELIER LAOUATE','Refrigerated compresses air dryer','P-75AC','/',NULL,'EQUIPEMENT ','2026.01','EN ATN','EN MARCHE',0,1,'',8,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(185,'M185','GROUPE ELECTROGENE /700kva','ATELIER LE ROULER','GMI','/','/',NULL,'EQUIPEMENT ','/','EN ATN','EN MARCHE',1,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(186,'M186','POMPE D\'EAU','ATELIER LE ROULER','/','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(187,'M187','POMPE D\'EAU','ATELIER LE ROULER','/','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(188,'M188','POMPE D\'EAU','ATELIER LE ROULER','/','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',9,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(189,'M189',' BALANCE','ATELIER DE COUTURE FEMMES','/','/','/',NULL,'EQUIPEMENT ','/','EN MARCHE ','EN MARCHE',0,2,'',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(190,'M190','COMPRESSEUE DAIR ','ATELIER DE DECOUPAGE NV','SHAMAL ','K25/500 CT 5','6391400030',NULL,'EQUIPEMENT ','7/15/1905','EN MARCHE ','EN MARCHE',0,1,'',6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(191,'M191','COMPRESSEUE DAIR ','ATELIER DE DECOUPAGE NV','ATLAS COPCO ','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(192,'M192','GROUPE D\'EAU GLACE','ATELIER PRODUCTION DE MOUSSE','Midea','MC-SS65/RN1L','541L151720141170',NULL,'EQUIPEMENT ','/','EN MARCHE ','EN MARCHE',1,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(193,'M193','COMPRESSEUE DAIR ','ATELIER PRODUCTION DE MOUSSE','ATLAS COPCO AIRPOWER n.v','G7FF','ITJ887904',NULL,'EQUIPEMENT ','7/16/1905','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(194,'M194','Foam Rebound Tester','ATELIER PRODUCTION DE MOUSSE','Haida International Equipement Co.,Ltd','HD-F754','ED260101002',NULL,'EQUIPEMENT ','2026.04.09','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(195,'M195','Foam Flammability Tester','ATELIER PRODUCTION DE MOUSSE','/','HD-F805','/',NULL,'EQUIPEMENT ','/','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(196,'M196','Foam Tensile & Compression Hardness Tester','ATELIER PRODUCTION DE MOUSSE','Haida International Equipement Co.,Ltd','HD-F750A','ED260101001',NULL,'EQUIPEMENT ','2026.04.09','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(197,'M197','Foam Pounding Fatigu Tester','ATELIER PRODUCTION DE MOUSSE','Haida International Equipement Co.,Ltd','HD-F750-1A','ED260101003',NULL,'EQUIPEMENT ','2026.04.09','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(198,'M198','Foam Air Permeability Tester','ATELIER PRODUCTION DE MOUSSE','Haida International Equipement Co.,Ltd','HD-W810','ED260101004',NULL,'EQUIPEMENT ','2026.04.09','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(199,'M199','Foam Compression Recover Time Tester','ATELIER PRODUCTION DE MOUSSE','Haida International Equipement Co.,Ltd','HD-F750-5','ED260101006',NULL,'EQUIPEMENT ','2026.04.09','EN MARCHE ','EN MARCHE',0,1,'',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(200,'M200','GROUPE ELECTROGENE','ADMINISTRATION','EMSA','E DT EG 0850','20192315',NULL,'EQUIPEMENT ','10/2019','EN MARCHE ','EN MARCHE',0,1,'',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(201,'M201','GROUPE ELECTROGENE','ATELIER CARCASSE','/','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(202,'M202','COMPRESSEUE DAIR ','ATELIER CARCASSE','SCREW COMPRESSOR ','DL-30A','/',NULL,'EQUIPEMENT ','2010.08','HORS SERVICE ','EN MARCHE',0,1,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(203,'M203','COMPRESSEUE DAIR ','ATELIER CARCASSE','/','/','/',NULL,'EQUIPEMENT ','/','HORS SERVICE ','EN MARCHE',0,1,'',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `machines` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_log_attachments`
--

LOCK TABLES `maintenance_log_attachments` WRITE;
/*!40000 ALTER TABLE `maintenance_log_attachments` DISABLE KEYS */;
INSERT INTO `maintenance_log_attachments` VALUES (1,1,'IMAGE','Screenshot 2026-10-18 014650.png','20e88fe8-bc23-4d22-bd86-1e6b67194f4c.png','image/png',137821,'c508c1b7f82d6be0145b46445be9e33ebf299f467c3ea80351c7b0d03971451e','2026-11-05 18:59:51'),(2,2,'IMAGE','download.jfif','6d4be301-d2c4-4473-8804-9868829bf360.jpg','image/jpeg',186031,'49a07d3a61e7ee51b5e9a9b53e82037e9a1d235f159632dd3f6334c94067b45f','2026-11-08 20:41:55');
/*!40000 ALTER TABLE `maintenance_log_attachments` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_logs`
--

LOCK TABLES `maintenance_logs` WRITE;
/*!40000 ALTER TABLE `maintenance_logs` DISABLE KEYS */;
INSERT INTO `maintenance_logs` VALUES (1,NULL,'2026-11-05 00:00:00',NULL,NULL,203,'COMPRESSEUE DAIR ',2,'fucl in the fuck fucker','2026-11-05 18:59:51',NULL,'CORRECTIVE',0.00,1.50,'gfjhnfghnfgh','fucl in the fuck fucker',NULL,'1999-01-22 01:01:00','2026-11-05 07:59:52','1999-01-22 01:01:00',NULL,'2026-11-05 07:59:52','SUBMITTED','7e9e3782-80c1-4ae3-a562-72dc36fd97fb',1,'2026-11-05 18:59:52'),(2,3,'2026-11-08 00:00:00',NULL,NULL,104,'BALANCE (3 porte)',8,'cleaning the cum','2026-11-08 20:41:55',1,'CORRECTIVE',0.00,1.00,'cum','cleaning the cum',NULL,'1999-10-22 11:11:00','2026-11-08 09:41:55','1999-10-22 11:11:00',NULL,'2026-11-08 09:41:55','SUBMITTED','9c62823e-bbf1-433e-abb0-78053ff1478d',11,'2026-11-08 20:41:55');
/*!40000 ALTER TABLE `maintenance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_notification_settings`
--

DROP TABLE IF EXISTS `maintenance_notification_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_notification_settings` (
  `notification_type` enum('MACHINE_BREAKDOWN','TASK_ASSIGNED','TASK_REASSIGNED','TASK_DUE_SOON','TASK_DUE_TODAY','TASK_OVERDUE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` bigint unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_type`),
  KEY `fk_notification_settings_user` (`updated_by`),
  CONSTRAINT `fk_notification_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_notification_settings`
--

LOCK TABLES `maintenance_notification_settings` WRITE;
/*!40000 ALTER TABLE `maintenance_notification_settings` DISABLE KEYS */;
INSERT INTO `maintenance_notification_settings` VALUES ('MACHINE_BREAKDOWN',1,NULL,'2026-11-05 22:21:16'),('TASK_ASSIGNED',1,NULL,'2026-11-05 22:21:16'),('TASK_REASSIGNED',1,NULL,'2026-11-05 22:21:16'),('TASK_DUE_SOON',1,NULL,'2026-11-05 22:21:16'),('TASK_DUE_TODAY',1,NULL,'2026-11-05 22:21:16'),('TASK_OVERDUE',1,NULL,'2026-11-05 22:21:16');
/*!40000 ALTER TABLE `maintenance_notification_settings` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=1249 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_notifications`
--

LOCK TABLES `maintenance_notifications` WRITE;
/*!40000 ALTER TABLE `maintenance_notifications` DISABLE KEYS */;
INSERT INTO `maintenance_notifications` VALUES (1,1,104,3,'TASK_ASSIGNED','213558696772',NULL,'Maintenance task assigned: Whatsapptest (#1). M095 — BALANCE (3 porte). Priority: LOW. Due: Tue Dec 15 2026 23:59:59 GMT-1100 (GMT-11:00).','FAILED',5,NULL,NULL,NULL,'Invalid OAuth access token - Cannot parse access token',NULL,NULL,'task:1:assigned:0d9f7f23-9af4-4c20-aa10-d76d02cc8d07:technician:3','2026-10-27 00:51:20','2026-10-29 20:41:15'),(2,NULL,197,3,'MACHINE_BREAKDOWN','213558696772',NULL,'Machine breakdown: M197 — Foam Pounding Fatigu Tester. Machine recorded as broken. Workshop: ATELIER PRODUCTION DE MOUSSE. Severity: HIGH. Symptom: j:;,bhkl;jhbk. Downtime minutes: 55.','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'breakdown:1:technician:3','2026-11-05 19:05:52','2026-11-05 22:16:46'),(3,2,197,3,'TASK_ASSIGNED','213558696772',NULL,'Maintenance task assigned: PM: jbnkljhk (#2). Maintenance task. Priority: MEDIUM. Due: Wed Nov 04 2026 00:00:00 GMT-1100 (GMT-11:00).','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'pm:2:2026-11-04 00:00:00:technician:3','2026-11-05 19:07:24','2026-11-05 22:16:46'),(4,3,113,3,'TASK_ASSIGNED','213558696772',NULL,'Maintenance task assigned: kjhkjh (#3). M104 — LA PRESSE. Priority: HIGH. Due: Not set.','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'task:3:assigned:a9712b0d-49db-47ae-8c12-b6e835c819ca:technician:3','2026-11-05 19:07:55','2026-11-05 22:16:46'),(5,2,197,3,'TASK_OVERDUE','213558696772',NULL,'Maintenance task overdue: PM: jbnkljhk (#2). M197 — Foam Pounding Fatigu Tester. Due: 2026-11-04 11:00.','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'task:2:task_overdue:2026-11-05','2026-11-05 19:12:24','2026-11-05 22:16:46'),(34,NULL,1,3,'MACHINE_BREAKDOWN','213558696772',NULL,'Machine breakdown: M001 — LIGNE DE PRODUCTION DE LA MOUSSE. Machine recorded as broken. Workshop: ATELIER PRODUCTION DE MOUSSE. Severity: Not specified. Symptom: Not specified. Downtime minutes: Not recorded.','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'machine:1:breakdown:cbae7329-06c1-402e-8245-af8941ba3249:technician:3','2026-11-05 21:10:49','2026-11-05 22:16:46'),(44,NULL,1,3,'MACHINE_BREAKDOWN','213558696772',NULL,'Machine breakdown: M001 — LIGNE DE PRODUCTION DE LA MOUSSE. Machine recorded as broken. Workshop: ATELIER PRODUCTION DE MOUSSE. Severity: Not specified. Symptom: Not specified. Downtime minutes: Not recorded.','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'machine:1:breakdown:d9deff81-e03f-4c5b-bc6b-69a37b49659c:technician:3','2026-11-05 21:58:19','2026-11-05 22:16:46'),(45,NULL,2,3,'MACHINE_BREAKDOWN','213558696772',NULL,'Machine breakdown: M002 — ONDULEUR POUR LAADER BERG. Machine recorded as broken. Workshop: ATELIER PRODUCTION DE MOUSSE. Severity: Not specified. Symptom: Not specified. Downtime minutes: Not recorded.','SKIPPED',1,NULL,NULL,NULL,'Recipient email address is missing or invalid.',NULL,NULL,'machine:2:breakdown:83f3744d-8b29-4731-95f2-2dd1d3872b20:technician:3','2026-11-05 21:58:40','2026-11-05 22:16:46'),(76,4,167,5,'TASK_ASSIGNED',NULL,'momnbld@gmail.com','Maintenance task assigned: Email Test (#4). M157 — MACHINE OUATINAGE 03 AVEC SURGET. Priority: LOW. Due: Wed Dec 15 2027 23:59:59 GMT-1100 (GMT-11:00).','SENT',1,'1a1abb0a430a56fa','GMAIL_SENT','2026-11-05 13:31:18',NULL,NULL,'2026-11-05 13:31:18','task:4:assigned:29183b75-67c2-499a-83a5-89736d8d1a10:technician:5','2026-11-06 00:30:47','2026-11-06 00:31:18'),(77,NULL,195,6,'TASK_ASSIGNED',NULL,'unesshni9@gmail.com','Maintenance task assigned: FIX (#6). M195 — Foam Flammability Tester. Priority: LOW. Due: Wed Dec 15 2027 23:59:59 GMT-1100 (GMT-11:00).','SENT',1,'1a1abb1f8673d5b7','GMAIL_SENT','2026-11-05 13:32:46',NULL,NULL,'2026-11-05 13:32:46','task:6:assigned:dda3678b-8b7a-4f39-93e4-eb8fb59c5988:technician:6','2026-11-06 00:32:24','2026-11-06 00:32:46'),(82,2,197,3,'TASK_OVERDUE',NULL,'whatsapptest1205@gmail.com','Maintenance task overdue: PM: jbnkljhk (#2). M197 — Foam Pounding Fatigu Tester. Due: 2026-11-04 11:00.','SENT',1,'1a1ba113f1816dd8','GMAIL_SENT','2026-11-08 08:31:44',NULL,NULL,'2026-11-08 08:31:44','task:2:task_overdue:2026-11-08','2026-11-08 19:31:06','2026-11-08 19:31:44'),(83,7,203,4,'TASK_ASSIGNED',NULL,'unesshni9@gmail.com','Maintenance task assigned: PM: lhgdssghj (#7). Maintenance task. Priority: MEDIUM. Due: Fri Nov 06 2026 00:00:00 GMT-1100 (GMT-11:00).','SENT',1,'1a1ba1145a30073f','GMAIL_SENT','2026-11-08 08:31:45',NULL,NULL,'2026-11-08 08:31:45','pm:1:2026-11-06 00:00:00:technician:4','2026-11-08 19:31:06','2026-11-08 19:31:45'),(85,7,203,4,'TASK_OVERDUE',NULL,'unesshni9@gmail.com','Maintenance task overdue: PM: lhgdssghj (#7). M203 — COMPRESSEUE DAIR. Due: 2026-11-06 11:00.','SENT',1,'1a1ba155c30568d0','GMAIL_SENT','2026-11-08 08:36:14',NULL,NULL,'2026-11-08 08:36:14','task:7:task_overdue:2026-11-08','2026-11-08 19:36:06','2026-11-08 19:36:14'),(102,8,153,4,'TASK_ASSIGNED',NULL,'unesshni9@gmail.com','Maintenance task assigned: PM: jhk (#8). Maintenance task. Priority: MEDIUM. Due: Sun Nov 08 2026 00:00:00 GMT-1100 (GMT-11:00).','SENT',1,'1a1ba3a19ad2474c','GMAIL_SENT','2026-11-08 09:16:21',NULL,NULL,'2026-11-08 09:16:21','pm:3:2026-11-08 00:00:00:technician:4','2026-11-08 20:16:06','2026-11-08 20:16:21'),(103,8,153,4,'TASK_DUE_TODAY',NULL,'unesshni9@gmail.com','Maintenance task due today: PM: jhk (#8). M143 — CONVOYEUR 13. Due: 2026-11-08 11:00.','SENT',1,'1a1ba3e974c2eb9c','GMAIL_SENT','2026-11-08 09:21:16',NULL,NULL,'2026-11-08 09:21:16','task:8:task_due_today:2026-11-08','2026-11-08 20:21:06','2026-11-08 20:21:16'),(364,2,197,3,'TASK_OVERDUE',NULL,'whatsapptest1205@gmail.com','Maintenance task overdue: PM: jbnkljhk (#2). M197 — Foam Pounding Fatigu Tester. Due: 2026-11-04 11:00.','SENT',1,'1a1bf37bd1fdc72f','GMAIL_SENT','2026-11-09 08:31:57',NULL,NULL,'2026-11-09 08:31:57','task:2:task_overdue:2026-11-09','2026-11-09 19:31:16','2026-11-09 19:31:57'),(365,7,203,4,'TASK_OVERDUE',NULL,'unesshni9@gmail.com','Maintenance task overdue: PM: lhgdssghj (#7). M203 — COMPRESSEUE DAIR. Due: 2026-11-06 11:00.','SENT',1,'1a1bf37c1454e62b','GMAIL_SENT','2026-11-09 08:31:58',NULL,NULL,'2026-11-09 08:31:58','task:7:task_overdue:2026-11-09','2026-11-09 19:31:16','2026-11-09 19:31:58'),(366,8,153,4,'TASK_OVERDUE',NULL,'unesshni9@gmail.com','Maintenance task overdue: PM: jhk (#8). M143 — CONVOYEUR 13. Due: 2026-11-08 11:00.','SENT',1,'1a1bf37c46c78021','GMAIL_SENT','2026-11-09 08:31:59',NULL,NULL,'2026-11-09 08:31:59','task:8:task_overdue:2026-11-09','2026-11-09 19:31:16','2026-11-09 19:31:59'),(892,2,197,3,'TASK_OVERDUE',NULL,'whatsapptest1205@gmail.com','Maintenance task overdue: PM: jbnkljhk (#2). M197 — Foam Pounding Fatigu Tester. Due: 2026-11-04 11:00.','SENT',1,'1a1c458cee7f5aed','GMAIL_SENT','2026-11-10 08:26:14',NULL,NULL,'2026-11-10 08:26:14','task:2:task_overdue:2026-11-10','2026-11-10 19:25:38','2026-11-10 19:26:14'),(893,7,203,4,'TASK_OVERDUE',NULL,'unesshni9@gmail.com','Maintenance task overdue: PM: lhgdssghj (#7). M203 — COMPRESSEUE DAIR. Due: 2026-11-06 11:00.','SENT',1,'1a1c458d32c4238f','GMAIL_SENT','2026-11-10 08:26:16',NULL,NULL,'2026-11-10 08:26:16','task:7:task_overdue:2026-11-10','2026-11-10 19:25:38','2026-11-10 19:26:16'),(894,8,153,4,'TASK_OVERDUE',NULL,'unesshni9@gmail.com','Maintenance task overdue: Changed (#8). M143 — CONVOYEUR 13. Due: 2026-11-09 10:59.','SENT',1,'1a1c458d7f186855','GMAIL_SENT','2026-11-10 08:26:17',NULL,NULL,'2026-11-10 08:26:17','task:8:task_overdue:2026-11-10','2026-11-10 19:25:38','2026-11-10 19:26:17');
/*!40000 ALTER TABLE `maintenance_notifications` ENABLE KEYS */;
UNLOCK TABLES;

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
  `status` enum('PENDING','WAITING_PARTS','IN_PROGRESS','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `due_date` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `blocked_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escalated_at` datetime DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_tasks`
--

LOCK TABLES `maintenance_tasks` WRITE;
/*!40000 ALTER TABLE `maintenance_tasks` DISABLE KEYS */;
INSERT INTO `maintenance_tasks` VALUES (1,'Whatsapptest',NULL,'CORRECTIVE',104,3,8,1,'LOW','COMPLETED','2026-12-15 23:59:59','2026-10-29 13:50:13','2026-11-08 09:41:55',NULL,NULL,'2026-10-27 00:51:20','2026-11-08 20:41:55'),(2,'PM: jbnkljhk','Automatically generated from preventive plan #2.','PREVENTIVE',197,3,1,NULL,'MEDIUM','IN_PROGRESS','2026-11-04 00:00:00',NULL,NULL,NULL,'2026-11-09 09:46:11','2026-11-05 19:07:24','2026-11-09 20:46:11'),(3,'kjhkjh','kjkhgk','CORRECTIVE',113,3,8,1,'HIGH','PENDING',NULL,NULL,NULL,NULL,NULL,'2026-11-05 19:07:55','2026-11-05 19:07:55'),(4,'Email Test','You need to get your ass into the field right now','CORRECTIVE',167,5,10,1,'LOW','PENDING','2027-12-15 23:59:59',NULL,NULL,NULL,NULL,'2026-11-06 00:30:47','2026-11-06 00:30:47'),(5,'Fix the ouate','Get yo ass into the field','CORRECTIVE',132,NULL,9,1,'LOW','PENDING','2027-12-15 23:59:59',NULL,NULL,NULL,NULL,'2026-11-06 00:31:52','2026-11-06 00:31:52'),(7,'PM: lhgdssghj',',nbvckl','PREVENTIVE',203,4,2,NULL,'MEDIUM','IN_PROGRESS','2026-11-06 00:00:00',NULL,NULL,NULL,'2026-11-09 09:46:11','2026-11-08 19:31:06','2026-11-09 20:46:11'),(8,'Changed','kjhk','PREVENTIVE',153,4,9,NULL,'MEDIUM','IN_PROGRESS','2026-11-08 23:59:59','2026-11-09 10:46:05',NULL,NULL,'2026-11-09 09:46:11','2026-11-08 20:16:06','2026-11-09 21:46:05');
/*!40000 ALTER TABLE `maintenance_tasks` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `production_records`
--

LOCK TABLES `production_records` WRITE;
/*!40000 ALTER TABLE `production_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_records` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Administrator'),(2,'production_chief','General Director of Workshops'),(3,'maintenance_worker','Technician'),(4,'workshop_head','Workshop Chief');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

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
  `hire_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `skill` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shift_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attendance_status` enum('present','absent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_technicians_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technicians`
--

LOCK TABLES `technicians` WRITE;
/*!40000 ALTER TABLE `technicians` DISABLE KEYS */;
INSERT INTO `technicians` VALUES (3,11,'Whatsapptest','0558696772','whatsapptest1205@gmail.com','available',NULL,'2026-10-26 22:45:31','2026-10-26 22:47:11',NULL,NULL,'present',1),(4,NULL,'Henni Younes',NULL,'unesshni9@gmail.com','available',NULL,'2026-11-05 23:06:32','2026-11-05 23:06:32',NULL,NULL,'present',1),(5,NULL,'Mokhtar Semghoun',NULL,'momnbld@gmail.com','available',NULL,'2026-11-06 00:28:30','2026-11-06 00:28:30',NULL,NULL,'present',1),(6,NULL,'Younes Henni',NULL,'unesshni9@gmail.com','available',NULL,'2026-11-06 00:31:12','2026-11-06 00:31:12',NULL,NULL,'present',1);
/*!40000 ALTER TABLE `technicians` ENABLE KEYS */;
UNLOCK TABLES;
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
-- Table structure for table `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_preferences`
--

LOCK TABLES `user_preferences` WRITE;
/*!40000 ALTER TABLE `user_preferences` DISABLE KEYS */;
INSERT INTO `user_preferences` VALUES (1,'ar','light','blue','compact','{\"email\": false, \"inApp\": true, \"lowStock\": true, \"urgentWork\": true, \"safetyFailure\": true, \"maintenanceDue\": true}','2026-11-10 01:06:58');
/*!40000 ALTER TABLE `user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

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
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Tester','deeznuts1205@gmail.com','$2b$12$.jZI7BZWZq1TSouE2i.R6OvjX8eGMbS6F99/C6GbZgzCcwJC3Rj0u',1,1,'2026-10-19 14:47:02','2026-10-20 07:01:59'),(5,'Oussama','oussamares1205@gmail.com','$2b$12$x7PHkE9/X1EXcrT0z4Rv0uYnrgHZeEDSbSYUZijsuCuPeXz7BBtTG',2,1,'2026-10-26 19:30:22','2026-10-26 21:02:59'),(8,'Hassan','hassanobama1205@gmail.com','$2b$12$l4b83zd/B/5izFMtCMxPxOSOiaBS1cngcJU5mBu.IBXfk.zJwljxy',4,1,'2026-10-26 21:13:34','2026-10-26 21:13:34'),(9,'adem','ademadem1205@gmail.com','$2b$12$yQF5DphmQYYcdRsMiDf1t.7LtIbpfPuvSZeCblct5G95d1fYal7ha',3,1,'2026-10-26 21:32:36','2026-10-26 21:33:52'),(11,'Whatsapptest','whatsapptest1205@gmail.com','$2b$12$tWGgcnR3D5pfxQCGfKJiIurfxniyKwurQtZ/LwUsGygl.MKblXw6G',3,1,'2026-10-26 22:44:54','2026-10-26 22:45:31'),(12,'fuck you too','fuckyou@gmail.com','$2b$12$h7fGAzwTPdJKN2faBesWk.aKvBGiK3CeNai05AtFc4Pisy5eFBYUi',4,1,'2026-10-28 02:11:35','2026-10-28 02:11:35');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
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
-- Dumping data for table `warehouse_movements`
--

LOCK TABLES `warehouse_movements` WRITE;
/*!40000 ALTER TABLE `warehouse_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_movements` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `warehouse_parts`
--

LOCK TABLES `warehouse_parts` WRITE;
/*!40000 ALTER TABLE `warehouse_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_parts` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `workshops`
--

LOCK TABLES `workshops` WRITE;
/*!40000 ALTER TABLE `workshops` DISABLE KEYS */;
INSERT INTO `workshops` VALUES ('ATELIER PRODUCTION DE MOUSSE',1,'ATELIER PRODUCTION DE MOUSSE','ATELIER PRODUCTION DE MOUSSE',NULL,NULL,NULL),('ATELIER CARCASSE',2,'ATELIER CARCASSE','ATELIER CARCASSE',NULL,NULL,NULL),('ATELIER CARDINAGE',3,'ATELIER CARDINAGE','ATELIER CARDINAGE',NULL,NULL,NULL),('ATELIER DE COUTURE FEMMES',4,'ATELIER DE COUTURE FEMMES','ATELIER DE COUTURE FEMMES','klmk,','535656',NULL),('ATELIER DE DECOUPAGE',5,'ATELIER DE DECOUPAGE','ATELIER DE DECOUPAGE',NULL,NULL,NULL),('ATELIER DE DECOUPAGE NV',6,'ATELIER DE DECOUPAGE NV','ATELIER DE DECOUPAGE NV',NULL,NULL,NULL),('ATELIER DE COUTURE',7,'ATELIER DE COUTURE','ATELIER DE COUTURE',NULL,NULL,NULL),('ATELIER LAOUATE',8,'ATELIER LAOUATE','ATELIER LAOUATE',NULL,NULL,NULL),('ATELIER LE ROULER',9,'ATELIER LE ROULER','ATELIER LE ROULER',NULL,NULL,NULL),('ATELIER OUATINAGE',10,'ATELIER OUATINAGE','ATELIER OUATINAGE',NULL,NULL,NULL),('ATELIER RECYCLAGE',11,'ATELIER RECYCLAGE','ATELIER RECYCLAGE',NULL,NULL,NULL),('ADMINISTRATION',12,'ADMINISTRATION','ADMINISTRATION',NULL,NULL,NULL);
/*!40000 ALTER TABLE `workshops` ENABLE KEYS */;
UNLOCK TABLES;

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

-- Dump completed on 2026-11-10 13:40:51
