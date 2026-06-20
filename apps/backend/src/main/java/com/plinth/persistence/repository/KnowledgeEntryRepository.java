package com.plinth.persistence.repository;

import com.plinth.persistence.entity.KnowledgeEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeEntryRepository extends JpaRepository<KnowledgeEntryEntity, Long> {
    List<KnowledgeEntryEntity> findByCompanyIdAndEntryType(String companyId, String entryType);
    List<KnowledgeEntryEntity> findByCompanyIdAndIsActiveTrue(String companyId);
    List<KnowledgeEntryEntity> findByCompanyId(String companyId);
}
