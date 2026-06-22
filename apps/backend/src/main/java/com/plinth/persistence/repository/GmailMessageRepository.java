package com.plinth.persistence.repository;

import com.plinth.persistence.entity.GmailMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GmailMessageRepository extends JpaRepository<GmailMessageEntity, Long> {
    List<GmailMessageEntity> findByCompanyIdOrderByReceivedAtDesc(String companyId);
    boolean existsByMessageId(String messageId);
    Optional<GmailMessageEntity> findByCompanyIdAndMessageId(String companyId, String messageId);
}
