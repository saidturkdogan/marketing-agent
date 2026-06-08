package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlannerStepTest {

    @Mock
    private LlmService llmService;

    private final PromptCatalog prompts = new PromptCatalog();
    private PlannerStep step;

    @BeforeEach
    void setUp() {
        step = new PlannerStep(llmService, prompts);
    }

    @Test
    void shouldReturnPlannerName() {
        assertThat(step.name()).isEqualTo("Planner");
    }

    @Test
    void shouldReturnOrder10() {
        assertThat(step.order()).isEqualTo(10);
    }

    @Test
    void shouldPopulatePlanAndCompleteStep() {
        when(llmService.generate(anyString(), anyString())).thenReturn("Plan draft content");

        CompanyProfile profile = new CompanyProfile(
                "c1", "TestCo", "https://test.co", null, "Tech",
                "A test company", "Developers", "Professional", "Best value",
                List.of("Product A"), List.of("Competitor X"), null
        );
        CampaignState state = new CampaignState("camp-1", profile, "AI Marketing", List.of("LinkedIn"), List.of("social"));

        step.execute(state);

        assertThat(state.getPlan()).containsKey("campaign_title");
        assertThat(state.getPlan()).containsKey("draft");
        assertThat(state.getCompletedSteps()).contains("Planner");
    }
}