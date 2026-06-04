package com.marketingagent.controller;

import java.util.Map;

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
        String response = chatService.chat(companyId, message);
        return Map.of("response", response);
    }
}