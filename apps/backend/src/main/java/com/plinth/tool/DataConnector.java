package com.plinth.tool;

import java.util.Map;

public interface DataConnector {
    String name();
    boolean isAvailable();
    Map<String, Object> fetch(String topic, Map<String, String> params);
}
