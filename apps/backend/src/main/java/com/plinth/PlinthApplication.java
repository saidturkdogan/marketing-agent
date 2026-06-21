package com.plinth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class PlinthApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(PlinthApplication.class, args);
    }

    private static void loadDotenv() {
        List<String> candidates = List.of(
                ".env",
                "../.env",
                "../../.env"
        );
        for (String candidate : candidates) {
            Path path = Paths.get(candidate);
            if (Files.exists(path)) {
                try {
                    for (String line : Files.readAllLines(path)) {
                        line = line.strip();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eq = line.indexOf('=');
                        if (eq <= 0) continue;
                        String key = line.substring(0, eq).strip();
                        String value = line.substring(eq + 1).strip();
                        if (System.getProperty(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                    System.out.println("[Plinth] Loaded .env from " + path.toAbsolutePath());
                } catch (IOException e) {
                    System.out.println("[Plinth] Failed to load .env: " + e.getMessage());
                }
                return;
            }
        }
        System.out.println("[Plinth] No .env file found");
    }
}
