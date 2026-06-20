package com.plinth.persistence.repository;

import com.plinth.persistence.entity.GmailTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GmailTokenRepository extends JpaRepository<GmailTokenEntity, Long> {
    Optional<GmailTokenEntity> findByCompanyId(String companyId);
    Optional<GmailTokenEntity> findByUserId(Long userId);
    void deleteByCompanyId(String companyId);
}
