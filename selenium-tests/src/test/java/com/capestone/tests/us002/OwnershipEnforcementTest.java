package com.capestone.tests.us002;

import com.capestone.testsupport.ApiClient;
import com.capestone.testsupport.TestConfig;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Release guard (EPMCDMETST-68339 regression coverage): only a course's owner may update or delete it.
 * Uses a throwaway course owned by Joe, so seeded data is never modified.
 */
public class OwnershipEnforcementTest {
  private static final String ORIGINAL_TITLE = "Ownership fixture (Selenium)";

  private int courseId;

  @BeforeEach
  void createFixtureOwnedByJoe() {
    courseId = ApiClient.createCourse(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD, ORIGINAL_TITLE);
  }

  @AfterEach
  void removeFixture() {
    ApiClient.deleteCourse(courseId, TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
  }

  private String currentTitle() {
    return ApiClient.getCourseById(courseId, null, null).jsonPath().getString("title");
  }

  @Test
  @DisplayName("A non-owner cannot update the course")
  void EPMCDMETST_68339_security_onlyOwnerCanUpdateCourse_forbiddenForNonOwner() {
    Response r = ApiClient.updateCourse(courseId, TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD,
        Map.of("title", "Updated Title Should Fail", "description", "Updated Description Should Fail"));

    assertThat(r.statusCode()).isEqualTo(403);
    assertThat(currentTitle()).isEqualTo(ORIGINAL_TITLE);
  }

  @Test
  @DisplayName("An unauthenticated request cannot update the course")
  void EPMCDMETST_68339_security_unauthenticatedUpdateIsRejected() {
    Response r = ApiClient.updateCourse(courseId, null, null,
        Map.of("title", "Anonymous Update", "description", "Should fail"));

    assertThat(r.statusCode()).isEqualTo(401);
    assertThat(currentTitle()).isEqualTo(ORIGINAL_TITLE);
  }

  @Test
  @DisplayName("A non-owner cannot delete the course")
  void EPMCDMETST_68339_security_onlyOwnerCanDeleteCourse_forbiddenForNonOwner() {
    Response r = ApiClient.deleteCourse(courseId, TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);

    assertThat(r.statusCode()).isEqualTo(403);
    assertThat(ApiClient.getCourseById(courseId, null, null).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("The owner can update the course")
  void EPMCDMETST_68339_security_ownerCanUpdateCourse() {
    Response r = ApiClient.updateCourse(courseId, TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD,
        Map.of("title", "Updated by owner", "description", "Allowed"));

    assertThat(r.statusCode()).isEqualTo(204);
    assertThat(currentTitle()).isEqualTo("Updated by owner");
  }
}
