package com.epam.sdlc.tests;

import com.epam.sdlc.api.ApiClient;
import com.epam.sdlc.config.TestConfig;
import com.epam.sdlc.pages.SignInPage;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class OwnershipEnforcementTest extends BaseUiTest {

  @Test
  void EPMCDMETST_67880_AC_postAssignsAuthenticatedUserIgnoresSpoofedUserId() {
    String auth = ApiClient.basicAuth(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    Map<String, Object> payload = new HashMap<>();
    payload.put("title", "Spoof attempt " + System.currentTimeMillis());
    payload.put("description", "userId must be ignored");
    payload.put("userId", 2);

    Response create = ApiClient.createCourse(auth, payload);
    assertEquals(201, create.statusCode());

    String location = create.getHeader("Location");
    assertNotNull(location);
    long id = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));

    Response get = ApiClient.getCourse(id);
    assertEquals(200, get.statusCode());
    int userId = get.jsonPath().getInt("userId");
    assertEquals(1, userId, "Owner must be Joe (seed userId=1)");
  }

  @Test
  void EPMCDMETST_67880_AC_putBlocksNonOwnerWith403() {
    // Find a course not owned by Sally (seed userId=2)
    Response list = ApiClient.listCourses(Map.of("page", 1, "pageSize", 20));
    assertEquals(200, list.statusCode());
    List<Map<String, Object>> courses = list.jsonPath().getList("$");
    assertNotNull(courses);
    Map<String, Object> notOwned = courses.stream().filter(c -> ((Number) c.get("userId")).intValue() != 2).findFirst()
        .orElseThrow(() -> new AssertionError("Need at least one course not owned by Sally"));

    long courseId = ((Number) notOwned.get("id")).longValue();

    String sallyAuth = ApiClient.basicAuth(TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);
    Response update = ApiClient.updateCourse(sallyAuth, courseId, Map.of("title", "Unauthorized update"));
    assertEquals(403, update.statusCode());
    assertTrue(update.asString().toLowerCase().contains("forbidden"));
  }

  @Test
  void EPMCDMETST_67880_AC_deleteBlocksNonOwnerWith403() {
    Response list = ApiClient.listCourses(Map.of("page", 1, "pageSize", 20));
    assertEquals(200, list.statusCode());
    List<Map<String, Object>> courses = list.jsonPath().getList("$");
    Map<String, Object> notOwned = courses.stream().filter(c -> ((Number) c.get("userId")).intValue() != 2).findFirst()
        .orElseThrow(() -> new AssertionError("Need at least one course not owned by Sally"));

    long courseId = ((Number) notOwned.get("id")).longValue();
    String sallyAuth = ApiClient.basicAuth(TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);

    Response del = ApiClient.deleteCourse(sallyAuth, courseId);
    assertEquals(403, del.statusCode());
    assertTrue(del.asString().toLowerCase().contains("forbidden"));
  }

  @Test
  void EPMCDMETST_67880_AC_putIgnoresPayloadUserIdOwnershipImmutable() {
    String joeAuth = ApiClient.basicAuth(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    Response create = ApiClient.createCourse(joeAuth, Map.of(
        "title", "Ownership immutable " + System.currentTimeMillis(),
        "description", "Attempt to change userId"
    ));
    assertEquals(201, create.statusCode());

    long id = Long.parseLong(create.getHeader("Location").substring(create.getHeader("Location").lastIndexOf('/') + 1));

    Response update = ApiClient.updateCourse(joeAuth, id, Map.of(
        "title", "Updated title " + System.currentTimeMillis(),
        "userId", 2
    ));
    assertEquals(204, update.statusCode());

    Response get = ApiClient.getCourse(id);
    assertEquals(200, get.statusCode());
    assertEquals(1, get.jsonPath().getInt("userId"), "userId must remain Joe's");
  }

  @Test
  void EPMCDMETST_67880_AC_uiFormsOmitUserIdField() {
    // Practical UI assertion (Selenium cannot reliably intercept fetch/XHR without extra tooling):
    // verify the UI forms do not expose a userId input.

    new SignInPage(driver).open().signIn(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    driver.get(TestConfig.UI_BASE_URL + "/courses/create");
    // Wait for the form to render so the absence check below is meaningful
    new org.openqa.selenium.support.ui.WebDriverWait(driver, java.time.Duration.ofSeconds(10))
        .until(org.openqa.selenium.support.ui.ExpectedConditions.visibilityOfElementLocated(
            org.openqa.selenium.By.cssSelector("input#courseTitle")));
    boolean hasUserIdInput = driver.findElements(org.openqa.selenium.By.cssSelector("input[name='userId'], input#userId")).size() > 0;
    assertFalse(hasUserIdInput, "Create form must not include userId field");
  }
}
