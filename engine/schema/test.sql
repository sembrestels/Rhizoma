--
-- Rhizoma database test schema
--

-- record membership in an access collection
CREATE TABLE IF NOT EXISTS `prefix_test_table1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_guid` int(11) NOT NULL,
  `access_collection_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- define an access collection
CREATE TABLE IF NOT EXISTS `prefix_test_table2` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `owner_guid` bigint(20) unsigned NOT NULL,
  `site_guid` bigint(20) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `owner_guid` (`owner_guid`),
  KEY `site_guid` (`site_guid`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
