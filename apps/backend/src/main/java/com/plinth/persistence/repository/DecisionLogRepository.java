package com.plinth.persistence.repository;

import com.plinth.persistence.entity.DecisionLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DecisionLogRepository extends JpaRepository<DecisionLogEntity, Long> {
    List<DecisionLogEntity> findByCampaignIdOrderByCreatedAtAsc(String campaignId);

    List<DecisionLogEntity> findByCampaignIdAndStepNameOrderByCreatedAtAsc(String campaignId, String stepName);
}
