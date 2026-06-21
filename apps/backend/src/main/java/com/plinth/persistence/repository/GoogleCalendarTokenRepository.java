package com.plinth.persistence.repository;

import com.plinth.persistence.entity.GoogleCalendarTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoogleCalendarTokenRepository extends JpaRepository<GoogleCalendarTokenEntity, Long> {
    Optional<GoogleCalendarTokenEntity> findByCompanyId(String companyId);
}
