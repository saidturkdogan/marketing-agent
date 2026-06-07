package com.marketingagent.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketingagent.service.ChatService;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/{companyId}")
    public Map<String, Object> chat(@PathVariable String companyId, @RequestBody Map<String, String> request) {
        String message = request.getOrDefault("message", "");
        if (message.isBlank()) {
            return Map.of("error", "Message is required");
        }
        String conversationId = request.get("conversationId");
        String response = chatService.chat(companyId, message);
        return Map.of("response", response);
    }

    // Conversation management
    @PostMapping("/{companyId}/conversations")
    public Map<String, String> createConversation(@PathVariable String companyId, @RequestBody Map<String, String> request) {
        String firstMessage = request.getOrDefault("message", "");
        return chatService.getOrCreateConversation(companyId, firstMessage);
    }

    @GetMapping("/{companyId}/conversations")
    public List<Map<String, Object>> listConversations(@PathVariable String companyId) {
        return chatService.getConversations(companyId);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<Map<String, Object>> listMessages(@PathVariable String conversationId) {
        return chatService.getMessages(conversationId);
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public Map<String, Object> saveMessage(@PathVariable String conversationId, @RequestBody Map<String, String> request) {
        String role = request.getOrDefault("role", "user");
        String content = request.getOrDefault("content", "");
        if (content.isBlank()) {
            return Map.of("error", "Content is required");
        }
        chatService.saveMessage(conversationId, role, content);
        return Map.of("status", "saved");
    }
}