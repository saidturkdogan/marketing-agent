package com.plinth.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.plinth.persistence.entity.ConversationEntity;

@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, Long> {

    Optional<ConversationEntity> findByConversationId(String conversationId);

    List<ConversationEntity> findByUserIdAndCompanyIdOrderByUpdatedAtDesc(Long userId, String companyId);

    List<ConversationEntity> findByUserIdOrderByUpdatedAtDesc(Long userId);
}