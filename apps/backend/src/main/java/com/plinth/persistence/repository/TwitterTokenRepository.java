package com.plinth.persistence.repository;

import com.plinth.persistence.entity.TwitterTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TwitterTokenRepository extends JpaRepository<TwitterTokenEntity, Long> {
    Optional<TwitterTokenEntity> findByCompanyId(String companyId);
    void deleteByCompanyId(String companyId);
}
