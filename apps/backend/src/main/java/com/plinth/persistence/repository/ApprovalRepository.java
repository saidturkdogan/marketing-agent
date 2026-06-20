package com.plinth.persistence.repository;

import com.plinth.persistence.entity.ApprovalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalRepository extends JpaRepository<ApprovalEntity, Long> {
    List<ApprovalEntity> findByCampaignIdOrderByRequestedAtDesc(String campaignId);
    Optional<ApprovalEntity> findByApprovalId(String approvalId);
    List<ApprovalEntity> findByCampaignIdAndStatus(String campaignId, String status);
}
