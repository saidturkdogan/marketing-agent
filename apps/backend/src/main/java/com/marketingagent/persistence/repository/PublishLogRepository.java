package com.marketingagent.persistence.repository;

import com.marketingagent.persistence.entity.PublishLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PublishLogRepository extends JpaRepository<PublishLogEntity, Long> {
    List<PublishLogEntity> findByCampaignId(String campaignId);
}
