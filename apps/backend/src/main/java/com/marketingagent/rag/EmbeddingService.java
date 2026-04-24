package com.marketingagent.rag;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

@Service
public class EmbeddingService {

    public List<Double> embed(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
            String hex = HexFormat.of().formatHex(hash);
            List<Double> vector = new ArrayList<>();
            for (int i = 0; i < 32; i += 2) {
                int value = Integer.parseInt(hex.substring(i, i + 2), 16);
                vector.add(value / 255.0);
            }
            return vector;
        } catch (Exception ex) {
            throw new IllegalStateException("Embedding generation failed", ex);
        }
    }

    public List<String> serialize(List<Double> vector) {
        return vector.stream().map(String::valueOf).toList();
    }

    public List<Double> deserialize(List<String> vector) {
        return vector.stream().map(Double::parseDouble).toList();
    }
}
