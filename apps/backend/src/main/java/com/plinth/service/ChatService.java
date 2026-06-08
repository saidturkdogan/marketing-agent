package com.plinth.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.ChatMessageEntity;
import com.plinth.persistence.entity.ConversationEntity;
import com.plinth.persistence.repository.ChatMessageRepository;
import com.plinth.persistence.repository.ConversationRepository;
import com.plinth.security.AuthUtils;
import com.plinth.tool.PlatformToolService;
import com.plinth.tool.PolicyToolService;
import com.plinth.tool.SeoTool;
import com.plinth.tool.TrendTool;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final LlmService llmService;
    private final SeoTool seoTool;
    private final TrendTool trendTool;
    private final PlatformToolService platformToolService;
    private final PolicyToolService policyToolService;
    private final CompanyService companyService;
    private final ObjectMapper objectMapper;
    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AuthUtils authUtils;

    public ChatService(LlmService llmService, SeoTool seoTool, TrendTool trendTool,
                       PlatformToolService platformToolService, PolicyToolService policyToolService,
                       CompanyService companyService, ObjectMapper objectMapper,
                       ConversationRepository conversationRepository,
                       ChatMessageRepository chatMessageRepository,
                       AuthUtils authUtils) {
        this.llmService = llmService;
        this.seoTool = seoTool;
        this.trendTool = trendTool;
        this.platformToolService = platformToolService;
        this.policyToolService = policyToolService;
        this.companyService = companyService;
        this.objectMapper = objectMapper;
        this.conversationRepository = conversationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.authUtils = authUtils;
    }

    @Transactional
    public String chat(String companyId, String userMessage) {
        return processChat(companyId, userMessage);
    }

    @Transactional
    public Map<String, Object> chat(String companyId, String conversationId, String userMessage) {
        String response = processChat(companyId, userMessage);
        return Map.of("response", response, "conversationId", conversationId);
    }

    private String processChat(String companyId, String userMessage) {
        CompanyProfile profile = companyService.getProfile(companyId);

        // Step 1: Let AI decide which tools to use
        String toolDecision = llmService.generate(TOOL_DECISION_SYSTEM_PROMPT, buildToolDecisionUserPrompt(profile, userMessage));

        // Step 2: Parse and execute tools
        String toolResults = executeToolsFromDecision(toolDecision, userMessage, profile);

        // Step 3: Generate final response with tool results
        String finalResponse = llmService.generate(FINAL_RESPONSE_SYSTEM_PROMPT, buildFinalResponseUserPrompt(profile, userMessage, toolResults));

        return finalResponse;
    }

    @Transactional
    public Map<String, String> getOrCreateConversation(String companyId, String firstMessage) {
        Long userId = authUtils.getCurrentUserId();
        String title = firstMessage.length() > 60 ? firstMessage.substring(0, 60) + "..." : firstMessage;

        String conversationId = UUID.randomUUID().toString();
        ConversationEntity conversation = new ConversationEntity();
        conversation.setConversationId(conversationId);
        conversation.setTitle(title);
        conversation.setCompanyId(companyId);
        conversation.setUserId(userId);
        conversationRepository.save(conversation);

        return Map.of("conversationId", conversationId, "title", title);
    }

    @Transactional
    public void saveMessage(String conversationId, String role, String content) {
        ChatMessageEntity msg = new ChatMessageEntity();
        msg.setMessageId(UUID.randomUUID().toString());
        msg.setConversationId(conversationId);
        msg.setRole(role);
        msg.setContent(content);
        msg.setTimestamp(OffsetDateTime.now());
        chatMessageRepository.save(msg);

        // Update conversation's updatedAt
        conversationRepository.findByConversationId(conversationId).ifPresent(conv -> {
            conv.setUpdatedAt(OffsetDateTime.now());
            conversationRepository.save(conv);
        });
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConversations(String companyId) {
        Long userId = authUtils.getCurrentUserId();
        List<ConversationEntity> conversations;
        if (companyId != null && !companyId.isBlank()) {
            conversations = conversationRepository.findByUserIdAndCompanyIdOrderByUpdatedAtDesc(userId, companyId);
        } else {
            conversations = conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        }

        return conversations.stream().map(conv -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", conv.getConversationId());
            map.put("title", conv.getTitle());
            map.put("companyId", conv.getCompanyId());
            map.put("createdAt", conv.getCreatedAt().toString());
            map.put("updatedAt", conv.getUpdatedAt().toString());
            return map;
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMessages(String conversationId) {
        return chatMessageRepository.findByConversationIdOrderByTimestampAsc(conversationId).stream().map(msg -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", msg.getMessageId());
            map.put("role", msg.getRole());
            map.put("content", msg.getContent());
            map.put("timestamp", msg.getTimestamp().toString());
            return map;
        }).toList();
    }

    public ChatStreamer chatStreaming(String companyId, String userMessage) {
        return new ChatStreamer(this, companyService, companyId, userMessage);
    }

    @Transactional
    public ChatStreamer chatStreaming(String companyId, String conversationId, String userMessage) {
        return new ChatStreamer(this, companyService, companyId, conversationId, userMessage);
    }

    String executeToolsFromDecision(String toolDecision, String userMessage, CompanyProfile profile) {
        StringBuilder results = new StringBuilder();

        try {
            String jsonStr = extractJson(toolDecision);
            if (jsonStr == null) {
                return "No specific tools were needed for this query.";
            }

            JsonNode root = objectMapper.readTree(jsonStr);
            JsonNode tools = root.path("tools");
            if (!tools.isArray() || tools.isEmpty()) {
                return "No specific tools were needed for this query.";
            }

            for (JsonNode toolNode : tools) {
                String toolName = toolNode.path("name").asText();
                String toolQuery = toolNode.path("query").asText();

                if (toolQuery.isBlank()) {
                    toolQuery = userMessage;
                }

                try {
                    switch (toolName.toLowerCase()) {
                        case "seo" -> {
                            Map<String, Object> seoResult = seoTool.keywords(toolQuery);
                            results.append("\n### SEO Analysis Results\n").append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(seoResult)).append("\n");
                        }
                        case "trends" -> {
                            Map<String, Object> trendResult = trendTool.trends(toolQuery);
                            results.append("\n### Trend Research Results\n").append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(trendResult)).append("\n");
                        }
                        case "policy" -> {
                            String policyResult = policyToolService.check(toolQuery);
                            results.append("\n### Policy Check Results\n").append(policyResult).append("\n");
                        }
                        case "platform" -> {
                            String platform = toolNode.path("platform").asText("linkedin");
                            Map<String, Object> specResult = platformToolService.specs(platform);
                            results.append("\n### Platform Specs (").append(platform).append(")\n").append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(specResult)).append("\n");
                            // Also get hashtags
                            List<String> hashtags = platformToolService.hashtags(toolQuery);
                            results.append("### Hashtags\n").append(String.join(", ", hashtags)).append("\n");
                        }
                        case "content" -> {
                            results.append("\n### Content Generation Request\n").append("Generate platform-optimized content for: ").append(toolQuery).append("\n");
                        }
                        default -> results.append("\n### Unknown Tool: ").append(toolName).append("\n");
                    }
                } catch (Exception e) {
                    log.warn("Tool {} execution failed: {}", toolName, e.getMessage());
                    results.append("\n### Tool '").append(toolName).append("' failed: ").append(e.getMessage()).append("\n");
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse tool decision JSON: {}", e.getMessage());
            return "Tool decision parsing failed, proceeding with raw response.";
        }

        return results.length() > 0 ? results.toString() : "No tools were executed.";
    }

    String buildToolDecisionUserPrompt(CompanyProfile profile, String userMessage) {
        return """
               Company: %s
               Industry: %s
               Target Audience: %s
               
               User Message: %s
               
               Decide which tools are needed and respond in JSON.
               """.formatted(
                profile.name() != null ? profile.name() : "Unknown",
                profile.industry() != null ? profile.industry() : "General",
                profile.targetAudience() != null ? profile.targetAudience() : "General",
                userMessage
        );
    }

    String buildFinalResponseUserPrompt(CompanyProfile profile, String userMessage, String toolResults) {
        return """
               Company: %s
               Industry: %s
               Target Audience: %s
               Brand Voice: %s
               Value Proposition: %s
               Products/Services: %s
               
               User Message: %s
               
               Tool Execution Results:
               %s
               
               Craft a helpful, detailed marketing response incorporating the tool data above.
               If tool results are empty, use your general marketing knowledge.
               Format your response with Markdown for readability (headings, bullet points, tables where appropriate).
               """.formatted(
                profile.name() != null ? profile.name() : "Unknown",
                profile.industry() != null ? profile.industry() : "General",
                profile.targetAudience() != null ? profile.targetAudience() : "General",
                profile.brandVoice() != null ? profile.brandVoice() : "Professional",
                profile.valueProposition() != null ? profile.valueProposition() : "Not specified",
                profile.productsOrServices() != null ? String.join(", ", profile.productsOrServices()) : "Not specified",
                userMessage,
                toolResults.isBlank() ? "No special tools were required." : toolResults
        );
    }

    private String extractJson(String text) {
        if (text == null) return null;
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return null;
    }

    static final String TOOL_DECISION_SYSTEM_PROMPT = """
            You are a marketing AI assistant that decides which tools to use for a given query.
            
            Available tools:
            
            1. seo - SEO keyword research and on-page recommendations
               Input: topic or keyword phrase
               Returns: primary and secondary keywords with search volume estimates
            
            2. trends - Current market and industry trend research
               Input: topic to research
               Returns: interest trends, related queries, viral formats, hashtags
            
            3. policy - Check content against platform advertising policies
               Input: text to check for policy violations (spam terms, misleading claims)
               Returns: pass or violation details
            
            4. platform - Get platform-specific specs (character limits, formats, hashtag recommendations)
               Input: platform name (instagram, linkedin, tiktok, twitter) and topic
               Returns: platform specifications and recommended hashtags
            
            5. content - Generate platform-optimized content
               Input: content brief with platform and target details
               Returns: generated social media posts
            
            Rules:
            - For SEO/keyword questions → use seo tool
            - For trend/market research questions → use trends tool
            - For content creation requests → use content tool + platform tool
            - For policy/compliance questions → use policy tool
            - For platform-specific questions → use platform tool
            - You can use multiple tools if the query requires it
            - If no tool is needed, respond with {"tools": []}
            
            Respond ONLY with a JSON object in this exact format:
            {
              "tools": [
                {"name": "seo", "query": "specific search query"},
                {"name": "platform", "platform": "instagram", "query": "specific topic"}
              ],
              "reasoning": "brief explanation of tool selection"
            }
            """;

    static final String FINAL_RESPONSE_SYSTEM_PROMPT = """
            You are a professional marketing AI assistant. You help users with:
            - Content strategy and calendar planning
            - Social media post creation (Instagram, LinkedIn, TikTok, Twitter/X)
            - SEO optimization and keyword research
            - Campaign planning and execution
            - Competitor analysis and positioning
            - Brand voice and messaging
            
            You have access to SEO data, trend research, platform specifications, and policy guidelines.
            Use the provided tool results to give specific, actionable marketing advice.
            
            Guidelines:
            - Be specific: include actual numbers, hashtags, CTAs where available
            - Be platform-aware: tailor advice to the platforms mentioned
            - Use Markdown formatting for readability
            - Include practical examples and templates when helpful
            - Reference the company's actual brand details (name, industry, audience)
            - Keep responses focused and actionable
            """;

    /**
     * Helper class for streaming chat responses.
     */
    public static class ChatStreamer {
        private final ChatService chatService;
        private final CompanyService companyService;
        private final String companyId;
        private final String userMessage;
        private final String conversationId;
        private String finalResponse;

        ChatStreamer(ChatService chatService, CompanyService companyService, String companyId, String userMessage) {
            this.chatService = chatService;
            this.companyService = companyService;
            this.companyId = companyId;
            this.userMessage = userMessage;
            this.conversationId = null;
        }

        ChatStreamer(ChatService chatService, CompanyService companyService, String companyId, String conversationId, String userMessage) {
            this.chatService = chatService;
            this.companyService = companyService;
            this.companyId = companyId;
            this.userMessage = userMessage;
            this.conversationId = conversationId;
        }

        public String getFinalResponse() {
            if (finalResponse == null) {
                finalResponse = chatService.chat(companyId, userMessage);
            }
            return finalResponse;
        }

        public String getCompanyId() {
            return companyId;
        }

        public String getConversationId() {
            return conversationId;
        }
    }
}