package com.plinth.persistence.repository;

import com.plinth.persistence.entity.ContentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ContentRepository extends JpaRepository<ContentEntity, Long> {
    Optional<ContentEntity> findByContentId(String contentId);
    List<ContentEntity> findByCompanyIdOrderByCreatedAtDesc(String companyId);
    List<ContentEntity> findByCompanyIdAndStatusOrderByCreatedAtDesc(String companyId, String status);
    List<ContentEntity> findByStatusAndScheduledAtBefore(String status, OffsetDateTime before);
}
